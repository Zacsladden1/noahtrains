import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// This endpoint is intended to be called by a cron (Vercel Cron or similar)
// It sends nudges like breakfast/lunch/dinner reminders and a daily motivation.

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY as string;
    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    webpush.setVapidDetails('mailto:support@noahhtrains.app', vapidPublic, vapidPrivate);

    // Load all clients with timezone; default to UTC
    const { data: users } = await admin
      .from('profiles')
      .select('id, role, full_name, email, timezone')
      .in('role', ['client']);

    const now = new Date();

    const results: any[] = [];

    for (const u of users || []) {
      const tz = u.timezone || 'UTC';
      const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const y = local.getFullYear();
      const m = String(local.getMonth() + 1).padStart(2, '0');
      const d = String(local.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const hour = local.getHours();
      // If client marked a rest day today, notify their coach once
      {
        const { data: restEvent } = await admin
          .from('notification_events')
          .select('id')
          .eq('user_id', u.id)
          .eq('kind', 'client_rest_day')
          .eq('ymd', ymd)
          .maybeSingle();
        if (restEvent?.id) {
          const { data: rel } = await admin.from('clients').select('coach_id').eq('client_id', u.id).maybeSingle();
          const coachId = rel?.coach_id;
          if (coachId) {
            const { data: subs } = await admin
              .from('push_subscriptions')
              .select('endpoint, p256dh, auth')
              .eq('user_id', coachId);
            const payload = JSON.stringify({
              title: 'Rest day set by client',
              body: `${u.full_name || u.email || 'Client'} made today a rest day`,
              url: '/coach/clients'
            });
            const r = await Promise.allSettled((subs || []).map((s: any)=> webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)));
            results.push({ coach: coachId, kind: 'client_rest_day', client: u.id, sent: r.filter(x=>x.status==='fulfilled').length });
            // Also insert a guard so we don't notify multiple times via this job
            await admin.from('notification_events').insert({ user_id: u.id, kind: 'client_rest_day_notified', ymd });
          }
        }
      }

      // Helper to send a push notification
      const sendToUser = async (userId: string, title: string, body: string) => {
        const { data: subs } = await admin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', userId);
        const payload = JSON.stringify({ title, body, url: '/nutrition' });
        const res = await Promise.allSettled((subs || []).map((s: any) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)));
        return res.filter(r => r.status === 'fulfilled').length;
      };

      // Helper to guard one nudge per kind/day
      const guard = async (kind: string) => {
        const { data: existing } = await admin
          .from('notification_events')
          .select('id')
          .eq('user_id', u.id)
          .eq('kind', kind)
          .eq('ymd', ymd)
          .maybeSingle();
        if (existing?.id) return false;
        await admin.from('notification_events').insert({ user_id: u.id, kind, ymd });
        return true;
      };

      // Breakfast reminder at/after 10:00 local if no breakfast log yet
      if (hour === 10) {
        const { data: anyBreakfast } = await admin
          .from('nutrition_logs')
          .select('id')
          .eq('user_id', u.id)
          .eq('date', ymd)
          .ilike('meal', 'breakfast')
          .limit(1);
        if (!anyBreakfast || anyBreakfast.length === 0) {
          if (await guard('breakfast')) {
            const sent = await sendToUser(u.id, 'Log your breakfast', 'Tracking breakfast keeps you on target. Log it now.');
            results.push({ user: u.id, kind: 'breakfast', sent });
          }
        }
      }

      // Lunch reminder at/after 14:00 local
      if (hour === 14) {
        const { data: anyLunch } = await admin
          .from('nutrition_logs')
          .select('id')
          .eq('user_id', u.id)
          .eq('date', ymd)
          .ilike('meal', 'lunch')
          .limit(1);
        if (!anyLunch || anyLunch.length === 0) {
          if (await guard('lunch')) {
            const sent = await sendToUser(u.id, 'Lunch check-in', 'Don’t forget to log lunch. Every meal counts.');
            results.push({ user: u.id, kind: 'lunch', sent });
          }
        }
      }

      // Dinner reminder at/after 19:00 local
      if (hour === 19) {
        const { data: anyDinner } = await admin
          .from('nutrition_logs')
          .select('id')
          .eq('user_id', u.id)
          .eq('date', ymd)
          .ilike('meal', 'dinner')
          .limit(1);
        if (!anyDinner || anyDinner.length === 0) {
          if (await guard('dinner')) {
            const sent = await sendToUser(u.id, 'Dinner reminder', 'A quick dinner log keeps your day accurate.');
            results.push({ user: u.id, kind: 'dinner', sent });
          }
        }
      }

      // Morning positive prompt at 9am local
      if (hour === 9) {
        if (await guard('motivation')) {
          const sent = await sendToUser(u.id, 'Good morning!', 'Wake up and have a great day — you’ve got this.');
          results.push({ user: u.id, kind: 'motivation', sent });
        }
      }

      // Coach alert for missed workout at 20:00 local (8pm)
      if (hour === 20) {
        // If client has any planned workout today and none completed, alert coach
        const { data: planned } = await admin
          .from('workouts')
          .select('id, name, status, created_at, completed_at')
          .eq('user_id', u.id)
          .gte('created_at', `${ymd}T00:00:00`)
          .lte('created_at', `${ymd}T23:59:59`);
        const hasPlanned = (planned || []).some((w:any)=> w.status !== 'completed');
        const hasCompleted = (planned || []).some((w:any)=> w.status === 'completed');
        if (hasPlanned && !hasCompleted) {
          // find coach
          const { data: rel } = await admin.from('clients').select('coach_id').eq('client_id', u.id).maybeSingle();
          const coachId = rel?.coach_id;
          if (coachId && await guard(`missed-${u.id}`)) {
            const { data: subs } = await admin
              .from('push_subscriptions')
              .select('endpoint, p256dh, auth')
              .eq('user_id', coachId);
            const payload = JSON.stringify({ title: 'Client workout not completed', body: `${u.full_name || u.email || 'Client'} did not complete today’s workout`, url: '/coach/clients' });
            const r = await Promise.allSettled((subs || []).map((s: any)=> webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)));
            results.push({ coach: coachId, kind: 'missed', client: u.id, sent: r.filter(x=>x.status==='fulfilled').length });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

async function handler(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization') || '';
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY as string;
    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    webpush.setVapidDetails('mailto:support@noahhtrains.app', vapidPublic, vapidPrivate);

    const { data: users } = await admin
      .from('profiles')
      .select('id, role, full_name, email, timezone')
      .in('role', ['client']);

    const now = new Date();
    const results: any[] = [];

    for (const u of users || []) {
      const tz = u.timezone || 'Europe/London';
      const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const y = local.getFullYear();
      const m = String(local.getMonth() + 1).padStart(2, '0');
      const d = String(local.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;

      // guard: one motivation per day per user
      const { data: existing } = await admin
        .from('notification_events')
        .select('id')
        .eq('user_id', u.id)
        .eq('kind', 'motivation')
        .eq('ymd', ymd)
        .maybeSingle();
      if (existing?.id) {
        results.push({ user: u.id, skipped: 'already_sent_today', ymd });
        continue;
      }
      await admin.from('notification_events').insert({ user_id: u.id, kind: 'motivation', ymd });

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', u.id);

      if (!subs || subs.length === 0) {
        results.push({ user: u.id, skipped: 'no_subscriptions' });
        continue;
      }

      const payload = JSON.stringify({ title: 'Reminder', body: 'Eat up, hit your macros, and don\'t ghost your tracking app today!', url: '/nutrition' });
      const sent = await Promise.allSettled((subs || []).map((s: any) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)));
      const failures = sent.filter(r=>r.status==='rejected').map((r: any)=>r.reason?.message);
      results.push({ user: u.id, sent: sent.filter(r=>r.status==='fulfilled').length, failures });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}



import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Sends an immediate push to the client's coach when the client sets a rest day
export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'Missing clientId' }, { status: 400 });
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

    // Find coach for the client
    const { data: rel } = await admin
      .from('clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .maybeSingle();
    const coachId = rel?.coach_id as string | undefined;
    if (!coachId) {
      return NextResponse.json({ ok: false, error: 'No assigned coach' }, { status: 200 });
    }

    // Resolve client display name
    let clientName = 'Client';
    const { data: clientProfile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', clientId)
      .maybeSingle();
    clientName = (clientProfile?.full_name || clientProfile?.email || 'Client') as string;

    // Send push to coach
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', coachId);

    const payload = JSON.stringify({
      title: 'Rest day set by client',
      body: `${clientName} made today a rest day`,
      url: '/coach/clients'
    });

    const results = await Promise.allSettled((subs || []).map((s: any) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)
    ));

    return NextResponse.json({ ok: true, sent: results.filter(r => r.status === 'fulfilled').length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export async function POST(req: NextRequest) {
  try {
    const { userIds, payload } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) return NextResponse.json({ ok: false, error: 'No userIds' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return NextResponse.json({ ok: false, error: 'VAPID not configured' }, { status: 500 });

    webpush.setVapidDetails('mailto:support@noahhtrains.app', publicKey, privateKey);

    const payloadStr = JSON.stringify(payload || { title: 'Notification', body: '', url: '/' });

    const results = await Promise.allSettled((subs || []).map((s: any) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payloadStr)
    ));

    return NextResponse.json({ ok: true, sent: results.filter(r => r.status === 'fulfilled').length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

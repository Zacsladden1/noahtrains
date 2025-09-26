import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { threadId } = await req.json();
    if (!threadId) return NextResponse.json({ ok: false, error: 'Missing threadId' }, { status: 400 });

    const supabase = createServerClient();
    const { data: thread, error: thErr } = await supabase
      .from('message_threads')
      .select('id, client_id')
      .eq('id', threadId)
      .maybeSingle();
    if (thErr || !thread) return NextResponse.json({ ok: false, error: 'Thread not found' }, { status: 404 });

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', thread.client_id);

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return NextResponse.json({ ok: false, error: 'VAPID keys not configured' }, { status: 500 });

    webpush.setVapidDetails('mailto:support@noahhtrains.app', publicKey, privateKey);

    const payload = JSON.stringify({
      title: 'New message from your coach',
      body: 'Tap to open the conversation',
      url: `/coach/messages/${threadId}`
    });

    const results = await Promise.allSettled((subs || []).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)
    ));

    return NextResponse.json({ ok: true, sent: results.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { threadId, senderId, preview } = await req.json();
    if (!threadId) return NextResponse.json({ ok: false, error: 'Missing threadId' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: thread, error: thErr } = await admin
      .from('message_threads')
      .select('id, client_id, coach_id')
      .eq('id', threadId)
      .maybeSingle();
    if (thErr || !thread) return NextResponse.json({ ok: false, error: 'Thread not found' }, { status: 404 });

    // Determine recipients (other party in the thread)
    const recipients = [thread.client_id, thread.coach_id].filter((u: any) => u && u !== senderId);

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', recipients as any);

    // Resolve sender name
    let senderName = 'Someone';
    if (senderId) {
      const { data: sender } = await admin.from('profiles').select('full_name, email').eq('id', senderId).maybeSingle();
      senderName = (sender?.full_name || sender?.email || 'Someone');
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
    const privateKey = process.env.VAPID_PRIVATE_KEY as string;
    if (!publicKey || !privateKey) return NextResponse.json({ ok: false, error: 'VAPID keys not configured' }, { status: 500 });

    webpush.setVapidDetails('mailto:support@noahhtrains.app', publicKey, privateKey);

    const payload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: preview ? String(preview) : 'Tap to open the conversation',
      url: '/messages'
    });

    const results = await Promise.allSettled((subs || []).map((s: any) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)
    ));

    return NextResponse.json({ ok: true, sent: results.filter(r=>r.status==='fulfilled').length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

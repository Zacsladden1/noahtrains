import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import webpush from 'web-push';

// Expect VAPID keys in env for web push
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

export async function POST(req: Request) {
  try {
    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys are not configured' }, { status: 500 });
    }

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await (supabase as any)
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const payload = JSON.stringify({
      title: 'Noahhtrains',
      body: 'This is a test notification',
      url: '/dashboard',
      icon: '/no%20backround%20high%20quality%20logo%202.png',
    });

    const results = await Promise.allSettled(
      (data || []).map((sub: any) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: null,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          } as any,
          payload
        )
      )
    );

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

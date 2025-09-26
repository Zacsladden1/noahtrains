import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();
    if (!subscription) return NextResponse.json({ ok: false, error: 'Missing subscription' }, { status: 400 });

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return NextResponse.json({ ok: false, error: 'VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails('mailto:support@noahhtrains.app', publicKey, privateKey);

    const payload = JSON.stringify({
      title: 'Noahhtrains',
      body: 'Test notification from Nutrition page',
      url: '/dashboard'
    });

    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

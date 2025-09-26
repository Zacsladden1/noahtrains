import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();
    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing userId or subscription' }, { status: 400 });
    }

    const supabase = createServerClient();

    const record = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || null,
      auth: subscription.keys?.auth || null,
    } as any;

    // Upsert by unique endpoint
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(record, { onConflict: 'endpoint' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

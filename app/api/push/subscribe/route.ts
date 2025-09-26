import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, userId } = body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth || !userId) return NextResponse.json({ ok: false, error: 'Invalid subscription' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    await admin.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'endpoint' });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

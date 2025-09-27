import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false }, { status: 200 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = {
      occurred_at: new Date().toISOString(),
      message: String(body?.message || ''),
      stack: String(body?.stack || ''),
      url: String(body?.url || ''),
      user_agent: String(body?.userAgent || ''),
      type: String(body?.type || ''),
    };

    // Insert into a lightweight log table; create if missing in migration.
    await admin.from('client_error_logs').insert(payload);

    return NextResponse.json({ ok: true, id: payload.occurred_at });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

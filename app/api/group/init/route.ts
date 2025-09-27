import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json().catch(() => ({ userId: null }));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    const admin = createClient(url, serviceKey);

    // 1) Ensure a global thread exists
    let { data: existing, error: selErr } = await admin
      .from('group_threads')
      .select('id')
      .eq('is_global', true)
      .maybeSingle();

    if (selErr) throw selErr;

    let threadId = existing?.id as string | null;
    if (!threadId) {
      const { data: created, error: insErr } = await admin
        .from('group_threads')
        .insert({ name: 'Community', is_global: true })
        .select('id')
        .single();
      if (insErr) throw insErr;
      threadId = created.id as string;
    }

    // 2) Optionally ensure membership for the provided user
    if (userId && threadId) {
      await admin
        .from('group_members')
        .upsert({ thread_id: threadId, user_id: userId }, { onConflict: 'thread_id,user_id' });
    }

    return NextResponse.json({ id: threadId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'init failed' }, { status: 500 });
  }
}



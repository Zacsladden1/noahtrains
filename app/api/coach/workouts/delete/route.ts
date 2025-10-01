import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const coachId: string | undefined = body?.coachId;
    const workoutId: string | undefined = body?.workoutId;
    if (!coachId || !workoutId) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify coach owns this client workout via clients table
    const { data: w } = await admin.from('workouts').select('id, user_id, status').eq('id', workoutId).maybeSingle();
    if (!w) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    const { data: rel } = await admin.from('clients').select('coach_id').eq('client_id', (w as any).user_id).maybeSingle();
    if (!rel || rel.coach_id !== coachId) {
      return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 403 });
    }
    if ((w as any).status === 'completed') {
      return NextResponse.json({ ok: false, error: 'Cannot delete completed workouts' }, { status: 400 });
    }

    // Cascade deletes: workout_sets, links, etc. rely on ON DELETE CASCADE
    const { error: delErr } = await admin.from('workouts').delete().eq('id', workoutId);
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}



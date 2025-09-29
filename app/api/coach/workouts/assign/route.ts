import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SetRow = { exercise: string; sets: number; reps: number; weight: number };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const coachId: string | undefined = body?.coachId;
    const clientId: string | undefined = body?.clientId;
    const name: string | undefined = body?.name;
    const datesIso: string[] = Array.isArray(body?.datesIso) ? body.datesIso : [];
    const setTemplates: SetRow[] = Array.isArray(body?.sets) ? body.sets : [];

    if (!coachId || !clientId || !name || datesIso.length === 0) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify coach-client relationship
    const { data: rel } = await admin
      .from('clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .maybeSingle();
    if (!rel || rel.coach_id !== coachId) {
      return NextResponse.json({ ok: false, error: 'Not authorized for this client' }, { status: 403 });
    }

    // Insert workouts
    const workoutInserts = datesIso.map((iso) => ({
      user_id: clientId,
      name,
      status: 'planned',
      created_at: iso,
      notes: 'Assigned by coach',
    }));
    const { data: created, error: insErr } = await admin
      .from('workouts')
      .insert(workoutInserts)
      .select('id');
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message || 'Insert failed' }, { status: 500 });
    }

    // Insert sets per workout
    if (created && created.length > 0 && setTemplates && setTemplates.length > 0) {
      const allSets: any[] = [];
      for (const w of created) {
        setTemplates.forEach((tpl) => {
          const total = Math.max(1, Number(tpl.sets || 0));
          for (let i = 1; i <= total; i++) {
            allSets.push({
              workout_id: w.id,
              set_index: i,
              reps: Number(tpl.reps || 0),
              weight_kg: Number(tpl.weight || 0),
              notes: tpl.exercise || null,
            });
          }
        });
      }
      if (allSets.length) {
        const { error: setsErr } = await admin.from('workout_sets').insert(allSets);
        if (setsErr) {
          return NextResponse.json({ ok: false, error: setsErr.message || 'Failed to insert sets' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, count: created?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}



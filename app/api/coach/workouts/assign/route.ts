import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SetRow = { exercise: string; sets: number; reps: number | string; weight: number; videoId?: string };

function parseReps(reps: number | string | undefined): { repsNumber: number; repsRangeText?: string } {
  if (reps == null || reps === '') return { repsNumber: 0 };
  if (typeof reps === 'number') return { repsNumber: Math.max(0, Math.floor(reps)) };
  const raw = String(reps).trim();
  // Allow formats: "10", "8-12", "08-12" -> take lower bound for numeric reps
  const m = raw.match(/^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
  if (!m) {
    const n = Number(raw.replace(/[^0-9]/g, ''));
    return { repsNumber: isNaN(n) ? 0 : Math.max(0, Math.floor(n)) };
  }
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : undefined;
  const repsNumber = Math.max(0, Math.floor(isNaN(lo) ? 0 : lo));
  const repsRangeText = hi && !isNaN(hi) ? `${lo}-${hi}` : undefined;
  return { repsNumber, repsRangeText };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const coachId: string | undefined = body?.coachId;
    const clientId: string | undefined = body?.clientId;
    const name: string | undefined = body?.name;
    const datesIso: string[] = Array.isArray(body?.datesIso) ? body.datesIso : [];
    const setTemplates: SetRow[] = Array.isArray(body?.sets) ? body.sets : [];
    const videoId: string | undefined = body?.videoId || undefined;

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
      const exerciseVideoInserts: any[] = [];
      for (const w of created) {
        setTemplates.forEach((tpl) => {
          const total = Math.max(1, Number(tpl.sets || 0));
          const { repsNumber, repsRangeText } = parseReps(tpl.reps);
          for (let i = 1; i <= total; i++) {
            allSets.push({
              workout_id: w.id,
              set_index: i,
              reps: repsNumber,
              weight_kg: Number(tpl.weight || 0),
              notes: tpl.exercise || null,
              reps_text: repsRangeText || (typeof tpl.reps === 'string' ? tpl.reps : null),
            });
          }
          if (tpl.videoId) {
            // Link one video per exercise (group-level), not per set
            exerciseVideoInserts.push({
              workout_id: w.id,
              exercise_label: tpl.exercise || null,
              set_index: null,
              video_id: tpl.videoId,
              kind: 'form',
            } as any);
          }
        });
      }
      if (allSets.length) {
        const { error: setsErr } = await admin.from('workout_sets').insert(allSets);
        if (setsErr) {
          return NextResponse.json({ ok: false, error: setsErr.message || 'Failed to insert sets' }, { status: 500 });
        }
      }
      if (exerciseVideoInserts.length) {
        await admin.from('workout_exercise_videos').insert(exerciseVideoInserts).then(()=>null).catch(()=>null);
      }
    }

    // Attach a 'form' video link if provided or try best-effort match
    // If the caller supplied a specific videoId, prefer that for all created workouts
    try {
      if (created && created.length > 0) {
        let chosenId: string | null = null;
        if (videoId) {
          chosenId = videoId;
        } else {
          // Build a set of lookup keys: workout name words + exercise labels
          const keywords = new Set<string>();
          const addWords = (s?: string) => {
            if (!s) return;
            s.split(/[^a-zA-Z0-9]+/).filter(Boolean).forEach((w) => {
              if (w.length >= 3) keywords.add(w.toLowerCase());
            });
          };
          addWords(name);
          for (const tpl of setTemplates) addWords(tpl.exercise);

          const { data: vids } = await admin
            .from('videos')
            .select('id, title, tags, section')
            .eq('section', 'form')
            .limit(500);

          if (vids && vids.length && keywords.size > 0) {
            let best: { id: string; score: number } | null = null;
            for (const v of vids as any[]) {
              const hay = [String(v.title || '').toLowerCase(), ...(Array.isArray(v.tags) ? v.tags.map((t: any)=>String(t||'').toLowerCase()) : [])].join(' ');
              let score = 0;
              for (const k of keywords) { if (hay.includes(k)) score++; }
              if (score > 0 && (!best || score > best.score)) best = { id: v.id, score };
            }
            chosenId = best?.id || null;
          }
        }

        if (chosenId) {
          const links = (created as any[]).map((w) => ({ workout_id: w.id, video_id: chosenId!, kind: 'form' }));
          await admin.from('workout_videos').insert(links).then(()=>null).catch(()=>null);
        }
      }
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, count: created?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}



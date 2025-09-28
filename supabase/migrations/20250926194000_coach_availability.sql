-- Coach daily availability (simple weekly schedule)
create table if not exists public.coach_availability (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  dow int not null check (dow between 0 and 6), -- 0=Sunday ... 6=Saturday
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  primary key (coach_id, dow)
);

alter table public.coach_availability enable row level security;

drop policy if exists "view_coach_availability" on public.coach_availability;
create policy "view_coach_availability"
  on public.coach_availability for select to authenticated
  using (true);

drop policy if exists "coach_manage_own_availability" on public.coach_availability;
create policy "coach_manage_own_availability"
  on public.coach_availability for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());



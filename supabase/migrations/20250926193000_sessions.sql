-- Sessions for coach-client scheduling
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('pending','approved','cancelled','completed')) default 'pending',
  notes text,
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

-- View: coach or client can see their sessions
drop policy if exists "view_own_sessions" on public.sessions;
create policy "view_own_sessions"
  on public.sessions for select to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid());

-- Client can create pending sessions with their assigned coach
drop policy if exists "client_create_session" on public.sessions;
create policy "client_create_session"
  on public.sessions for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.client_id = auth.uid() and c.coach_id = sessions.coach_id
    )
  );

-- Coach can update their sessions
drop policy if exists "coach_manage_sessions" on public.sessions;
create policy "coach_manage_sessions"
  on public.sessions for update to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Client can cancel own sessions
drop policy if exists "client_cancel_own_session" on public.sessions;
create policy "client_cancel_own_session"
  on public.sessions for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Prevent overlapping approved sessions for a coach (simple constraint)
drop function if exists public.sessions_overlap() cascade;
create or replace function public.sessions_overlap() returns trigger as $$
begin
  if (new.status = 'approved') then
    if exists (
      select 1 from public.sessions s
      where s.coach_id = new.coach_id
        and s.status = 'approved'
        and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
        and s.id <> new.id
    ) then
      raise exception 'Coach has an overlapping approved session';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sessions_overlap_trg on public.sessions;
create trigger sessions_overlap_trg
  before insert or update on public.sessions
  for each row execute function public.sessions_overlap();



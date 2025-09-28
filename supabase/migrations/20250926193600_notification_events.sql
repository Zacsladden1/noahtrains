-- Track one-off notifications to avoid duplicates
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ymd text not null, -- local date key like 2025-09-28 based on user's timezone
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.notification_events enable row level security;

drop policy if exists "view_own_notification_events" on public.notification_events;
create policy "view_own_notification_events"
  on public.notification_events for select to authenticated
  using (user_id = auth.uid());

-- Prevent duplicates per user/kind/day
create unique index if not exists notification_events_unique
  on public.notification_events (user_id, kind, ymd);



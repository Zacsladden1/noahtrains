-- Push subscriptions per user
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy if not exists "User can view own push subs"
  on push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy if not exists "User can insert own push subs"
  on push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy if not exists "User can delete own push subs"
  on push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- Push subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text,
  auth text,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Only owner can access their subscriptions
create policy "Users manage own push subscriptions" on push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

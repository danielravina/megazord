-- User Dashboard Layout
create table user_dashboard (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  layout    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_dashboard enable row level security;

create policy "Users can read own dashboard"
  on user_dashboard for select
  using (auth.uid() = user_id);

create policy "Users can insert own dashboard"
  on user_dashboard for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dashboard"
  on user_dashboard for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

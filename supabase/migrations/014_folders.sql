-- 014: User-defined folders for the Drive-like scans view.
-- The 8 pre-made folders stay as front-end constants (folder ids live in
-- documents.folder as plain text). User folders are stored here and their
-- NAME is used as the documents.folder value.

create table folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table folders enable row level security;
create policy "Users can manage their own folders"
  on folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Todos
create table todos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table todos enable row level security;
create policy "Users can manage their own todos"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Calendar Events
create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  color text,
  is_project boolean not null default false,
  created_at timestamptz not null default now()
);

alter table events enable row level security;
create policy "Users can manage their own events"
  on events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kanban Requests
create table requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  files jsonb default '[]'::jsonb,
  comments jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table requests enable row level security;
create policy "Users can manage their own requests"
  on requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  location text,
  quote_price numeric,
  expenses numeric default 0,
  color text default '#3b82f6',
  start_date date,
  start_time text,
  duration text,
  closing_price numeric,
  search_words text,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Users can manage their own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Finance: Incomes
create table incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  date date not null,
  type text not null default 'שוטף',
  created_at timestamptz not null default now()
);

alter table incomes enable row level security;
create policy "Users can manage their own incomes"
  on incomes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Finance: Expenses
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  date date not null,
  category text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;
create policy "Users can manage their own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Finance: Tax Settings (one row per user)
create table tax_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vat_rate numeric default 17,
  vat_frequency text default 'bimonthly',
  vat_billing_day int default 15,
  income_tax_advance numeric default 0,
  income_tax_billing_day int default 15,
  bituah_leumi numeric default 5,
  bituah_leumi_billing_day int default 15,
  credit_points numeric default 2.25
);

alter table tax_settings enable row level security;
create policy "Users can manage their own tax settings"
  on tax_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Finance: Savings
create table savings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_type text not null,
  amount numeric not null default 0,
  date date not null,
  created_at timestamptz not null default now()
);

alter table savings enable row level security;
create policy "Users can manage their own savings"
  on savings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  tags text[] default '{}',
  extracted_text text,
  doc_type text default 'Other',
  date_on_doc date,
  total_amount numeric,
  project_id uuid references projects(id) on delete set null,
  folder text,
  is_investment boolean not null default false,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table documents enable row level security;
create policy "Users can manage their own documents"
  on documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Calculator History
create table calc_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expression text not null,
  result text not null,
  created_at timestamptz not null default now()
);

alter table calc_history enable row level security;
create policy "Users can manage their own calc history"
  on calc_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for documents
insert into storage.buckets (id, name, public) values ('documents', 'documents', true);
create policy "Users can upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Users can read their documents"
  on storage.objects for select
  using (bucket_id = 'documents');

-- Storage bucket for kanban attachments
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);
create policy "Users can upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');
create policy "Users can read attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

-- Customers
create table customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  vat_number text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
create policy "Users can manage their own customers"
  on customers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Projects: replace free-text customer_name with a customers FK
alter table projects add column customer_id uuid references customers(id) on delete set null;
alter table projects drop column customer_name;

-- Incomes: link to project + per-row VAT rate
alter table incomes add column project_id uuid references projects(id) on delete set null;
alter table incomes add column vat_rate numeric;

-- Invoices
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  invoice_number text not null,
  issue_date date not null,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  amount numeric not null default 0,
  vat_rate numeric not null default 17,
  status text not null default 'draft',
  notes text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;
create policy "Users can manage their own invoices"
  on invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bump default VAT rate to current Israeli rate (18%)
alter table tax_settings alter column vat_rate set default 18;

-- Suppliers: formalize the businesses table (used as the supplier address book).
-- The table already exists in production (created via dashboard); this migration
-- is idempotent and fills in any missing columns/RLS so local DBs match.

create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vat_number text,
  address text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

-- Columns added after the original manual creation
alter table businesses add column if not exists email text;
alter table businesses add column if not exists notes text;
alter table businesses add column if not exists created_at timestamptz not null default now();

alter table businesses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'businesses' and policyname = 'Users can manage their own businesses'
  ) then
    create policy "Users can manage their own businesses"
      on businesses for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists businesses_user_id_idx on businesses (user_id);
create index if not exists businesses_name_trgm_idx on businesses using gin (name gin_trgm_ops);
create index if not exists businesses_vat_number_trgm_idx on businesses using gin (vat_number gin_trgm_ops);

-- Point global search for suppliers at the new /suppliers/ page (like customers)
create or replace function global_search(search_query text)
returns table (result_type text, result_href text, result_title text, result_subtitle text)
language sql
security invoker
stable
as $$
(
  select 'לקוחות'::text, '/customers/?customer=' || c.id::text, c.name, nullif(array_to_string(array_remove(array[c.email, c.phone, c.company], null), ' · '), '')
  from customers c
  where c.user_id = auth.uid()
    and (c.name ilike '%' || search_query || '%' or c.email ilike '%' || search_query || '%' or c.phone ilike '%' || search_query || '%' or c.company ilike '%' || search_query || '%' or c.vat_number ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'פרויקטים'::text, '/projects/detail/?project=' || p.id::text, coalesce(cu.name, 'פרויקט'), nullif(concat_ws(' · ', p.location, p.search_words), '')
  from projects p left join customers cu on cu.id = p.customer_id
  where p.user_id = auth.uid()
    and (cu.name ilike '%' || search_query || '%' or p.location ilike '%' || search_query || '%' or p.search_words ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'חשבוניות'::text, '/invoices/?invoice=' || i.id::text, i.invoice_number, cu.name
  from invoices i left join customers cu on cu.id = i.customer_id
  where i.user_id = auth.uid()
    and (i.invoice_number ilike '%' || search_query || '%' or cu.name ilike '%' || search_query || '%' or i.notes ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'מסמכים'::text, '/documents/?document=' || d.id::text, d.title, nullif(concat_ws(' · ', d.doc_type, d.folder), '')
  from documents d
  where d.user_id = auth.uid()
    and (d.title ilike '%' || search_query || '%' or d.folder ilike '%' || search_query || '%' or d.doc_type ilike '%' || search_query || '%' or array_to_string(d.tags, ' ') ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'הכנסות'::text, '/finance/?tab=incomes&transaction=' || i.id::text, i.description, null::text
  from incomes i
  where i.user_id = auth.uid() and i.description ilike '%' || search_query || '%'
  limit 5
)
union all
(
  select 'הוצאות'::text, '/finance/?tab=expenses&transaction=' || e.id::text, e.description, e.category
  from expenses e
  where e.user_id = auth.uid() and (e.description ilike '%' || search_query || '%' or e.category ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'אירועים'::text, '/calendar/?event=' || ev.id::text, ev.title, ev.date::text
  from events ev
  where ev.user_id = auth.uid() and ev.title ilike '%' || search_query || '%'
  limit 5
)
union all
(
  select 'ספקים'::text, '/suppliers/?supplier=' || b.id::text, b.name, b.vat_number
  from businesses b
  where b.user_id = auth.uid() and (b.name ilike '%' || search_query || '%' or b.vat_number ilike '%' || search_query || '%')
  limit 5
)
$$;

grant execute on function global_search(text) to authenticated;

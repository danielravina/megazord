-- Global search across all user tables, scoped by auth.uid()

create extension if not exists pg_trgm;

create or replace function global_search(search_query text)
returns table (result_type text, result_href text, result_title text, result_subtitle text)
language sql
security invoker
stable
as $$
(
  select 'לקוחות'::text, '/customers/'::text, c.name, nullif(array_to_string(array_remove(array[c.email, c.phone, c.company], null), ' · '), '')
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
  select 'חשבוניות'::text, '/invoices/'::text, i.invoice_number, cu.name
  from invoices i left join customers cu on cu.id = i.customer_id
  where i.user_id = auth.uid()
    and (i.invoice_number ilike '%' || search_query || '%' or cu.name ilike '%' || search_query || '%' or i.notes ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'מסמכים'::text, '/documents/'::text, d.title, nullif(concat_ws(' · ', d.doc_type, d.folder), '')
  from documents d
  where d.user_id = auth.uid()
    and (d.title ilike '%' || search_query || '%' or d.folder ilike '%' || search_query || '%' or d.doc_type ilike '%' || search_query || '%' or array_to_string(d.tags, ' ') ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'משימות'::text, '/todos/'::text, t.text, null::text
  from todos t
  where t.user_id = auth.uid() and t.text ilike '%' || search_query || '%'
  limit 5
)
union all
(
  select 'בקשות'::text, '/kanban/'::text, r.title, r.details
  from requests r
  where r.user_id = auth.uid() and (r.title ilike '%' || search_query || '%' or r.details ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'הכנסות'::text, '/finance/'::text, i.description, null::text
  from incomes i
  where i.user_id = auth.uid() and i.description ilike '%' || search_query || '%'
  limit 5
)
union all
(
  select 'הוצאות'::text, '/finance/'::text, e.description, e.category
  from expenses e
  where e.user_id = auth.uid() and (e.description ilike '%' || search_query || '%' or e.category ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'אירועים'::text, '/calendar/'::text, ev.title, ev.date::text
  from events ev
  where ev.user_id = auth.uid() and ev.title ilike '%' || search_query || '%'
  limit 5
)
union all
(
  select 'ספקים'::text, '/documents/'::text, b.name, b.vat_number
  from businesses b
  where b.user_id = auth.uid() and (b.name ilike '%' || search_query || '%' or b.vat_number ilike '%' || search_query || '%')
  limit 5
)
$$;

grant execute on function global_search(text) to authenticated;

-- Trigram indexes to speed up the ilike '%query%' searches
create index if not exists customers_name_trgm_idx on customers using gin (name gin_trgm_ops);
create index if not exists projects_location_trgm_idx on projects using gin (location gin_trgm_ops);
create index if not exists projects_search_words_trgm_idx on projects using gin (search_words gin_trgm_ops);
create index if not exists invoices_number_trgm_idx on invoices using gin (invoice_number gin_trgm_ops);
create index if not exists documents_title_trgm_idx on documents using gin (title gin_trgm_ops);
create index if not exists documents_folder_trgm_idx on documents using gin (folder gin_trgm_ops);
create index if not exists todos_text_trgm_idx on todos using gin (text gin_trgm_ops);
create index if not exists requests_title_trgm_idx on requests using gin (title gin_trgm_ops);
create index if not exists incomes_description_trgm_idx on incomes using gin (description gin_trgm_ops);
create index if not exists expenses_description_trgm_idx on expenses using gin (description gin_trgm_ops);
create index if not exists events_title_trgm_idx on events using gin (title gin_trgm_ops);
create index if not exists businesses_name_trgm_idx on businesses using gin (name gin_trgm_ops);

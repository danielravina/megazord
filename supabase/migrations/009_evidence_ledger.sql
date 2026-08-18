-- 009: Evidence-based ledger. Finance is derived from invoices + documents scans.
-- The incomes/expenses tables are no longer a source of truth.

truncate table incomes;
truncate table expenses;

-- Global search: point at the renamed routes and drop the income/expense branches.
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
  select 'מסמכים'::text, '/documents/?view=' || i.id::text, i.invoice_number, cu.name
  from invoices i left join customers cu on cu.id = i.customer_id
  where i.user_id = auth.uid()
    and (i.invoice_number ilike '%' || search_query || '%' or cu.name ilike '%' || search_query || '%' or i.notes ilike '%' || search_query || '%')
  limit 5
)
union all
(
  select 'סריקות'::text, '/scans/?document=' || d.id::text, d.title, nullif(concat_ws(' · ', d.doc_type, d.folder), '')
  from documents d
  where d.user_id = auth.uid()
    and (d.title ilike '%' || search_query || '%' or d.folder ilike '%' || search_query || '%' or d.doc_type ilike '%' || search_query || '%' or array_to_string(d.tags, ' ') ilike '%' || search_query || '%')
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
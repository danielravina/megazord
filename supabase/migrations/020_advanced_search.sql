-- חיפוש מתקדם: אותה לוגיקה כמו global_search אבל עם סינון טווח תאריכים.
-- כל קטגוריה מסוננת לפי תאריך המפתח שלה:
--   לקוחות: created_at | פרויקטים: start_date (או created_at) | דו״חות: issue_date
--   מסמכים: date_on_doc (או date) | אירועים: date | ספקים: created_at
-- search_query יכול להיות ריק (חיפוש לפי טווח תאריכים בלבד).

create or replace function advanced_search(search_query text, date_from date default null, date_to date default null)
returns table (result_type text, result_href text, result_title text, result_subtitle text)
language sql
security invoker
stable
as $$
(
  select 'לקוחות'::text, '/customers/?customer=' || c.id::text, c.name, nullif(array_to_string(array_remove(array[c.email, c.phone, c.company], null), ' · '), '')
  from customers c
  where c.user_id = auth.uid()
    and c.name ilike '%' || search_query || '%'
    and (date_from is null or c.created_at::date >= date_from)
    and (date_to is null or c.created_at::date <= date_to)
  limit 20
)
union all
(
  select 'פרויקטים'::text, '/projects/detail/?project=' || p.id::text, coalesce(cu.name, 'פרויקט'), nullif(concat_ws(' · ', p.location, p.search_words), '')
  from projects p left join customers cu on cu.id = p.customer_id
  where p.user_id = auth.uid()
    and (cu.name ilike '%' || search_query || '%' or p.location ilike '%' || search_query || '%' or p.search_words ilike '%' || search_query || '%')
    and (date_from is null or coalesce(p.start_date, p.created_at::date) >= date_from)
    and (date_to is null or coalesce(p.start_date, p.created_at::date) <= date_to)
  limit 20
)
union all
(
  select 'דו״חות'::text, '/reports/?view=' || i.id::text, i.invoice_number, nullif(concat_ws(' · ', cu.name, i.issue_date::text), '')
  from invoices i left join customers cu on cu.id = i.customer_id
  where i.user_id = auth.uid()
    and (i.invoice_number ilike '%' || search_query || '%' or cu.name ilike '%' || search_query || '%' or i.notes ilike '%' || search_query || '%')
    and (date_from is null or i.issue_date >= date_from)
    and (date_to is null or i.issue_date <= date_to)
  limit 20
)
union all
(
  select 'מסמכים'::text, '/documents/?document=' || d.id::text, d.title, nullif(concat_ws(' · ', d.doc_type, d.folder, coalesce(d.date_on_doc::text, d.date::date::text)), '')
  from documents d
  where d.user_id = auth.uid()
    and (d.title ilike '%' || search_query || '%' or d.folder ilike '%' || search_query || '%' or d.doc_type ilike '%' || search_query || '%' or array_to_string(d.tags, ' ') ilike '%' || search_query || '%')
    and (date_from is null or coalesce(d.date_on_doc, d.date::date) >= date_from)
    and (date_to is null or coalesce(d.date_on_doc, d.date::date) <= date_to)
  limit 20
)
union all
(
  select 'אירועים'::text, '/calendar/?event=' || ev.id::text, ev.title, ev.date::text
  from events ev
  where ev.user_id = auth.uid() and ev.title ilike '%' || search_query || '%'
    and (date_from is null or ev.date >= date_from)
    and (date_to is null or ev.date <= date_to)
  limit 20
)
union all
(
  select 'ספקים'::text, '/suppliers/?supplier=' || b.id::text, b.name, b.vat_number
  from businesses b
  where b.user_id = auth.uid() and b.name ilike '%' || search_query || '%'
    and (date_from is null or b.created_at::date >= date_from)
    and (date_to is null or b.created_at::date <= date_to)
  limit 20
)
$$;

grant execute on function advanced_search(text, date, date) to authenticated;

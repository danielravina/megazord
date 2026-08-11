-- Drop the kanban feature (requests table + attachments storage bucket)
-- NOTE: the storage bucket is removed via the Storage API/dashboard, since
-- direct deletes from storage tables are blocked by the protect_delete trigger.

drop policy if exists "Users can manage their own requests" on requests;
drop table if exists requests cascade;

drop policy if exists "Users can upload attachments" on storage.objects;
drop policy if exists "Users can read attachments" on storage.objects;

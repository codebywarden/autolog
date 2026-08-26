-- Quick wins: let a service entry reference the specific MOT advisory it
-- resolves (defects live in mot_history.raw_data, not their own table,
-- so this points at a test + an index into that test's defects array
-- rather than a proper foreign key), and categorise attachments by type.

alter table public.service_entries
  add column resolved_mot_history_id uuid references public.mot_history(id),
  add column resolved_defect_index integer;

alter table public.file_attachments
  add column attachment_type text not null default 'other'
    check (attachment_type in ('invoice', 'receipt', 'mot_certificate', 'other'));

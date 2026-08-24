-- AutoLog invoice storage bucket + access policies.
-- Run this after 0001_core_schema.sql, in the Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Upload convention: objects are stored as "{vehicle_id}/{filename}",
-- so storage.foldername(name)[1] gives the vehicle_id to check
-- ownership against — no separate lookup table needed.
create policy "current owner can read own invoices"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id::text = (storage.foldername(name))[1]
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can upload own invoices"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id::text = (storage.foldername(name))[1]
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can delete own invoices"
  on storage.objects for delete
  using (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id::text = (storage.foldername(name))[1]
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

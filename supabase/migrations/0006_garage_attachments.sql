-- Let a garage with an active access grant upload and view invoice
-- attachments for the vehicles it services — mirrors the owner-only
-- policies from 0001/0002. Garages can add attachments but not delete
-- them (no delete policy here), matching the trust boundary already
-- used for service entries: a garage can write its own records, not
-- remove anyone else's.

create policy "garage with access can view attachments"
  on public.file_attachments for select
  using (
    exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = file_attachments.vehicle_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

create policy "garage with access can upload attachments"
  on public.file_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = file_attachments.vehicle_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

-- Same grant check against the invoices bucket, keyed off the
-- vehicle_id folder prefix already used by upload paths.
create policy "garage with access can read invoices"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id::text = (storage.foldername(name))[1]
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

create policy "garage with access can upload invoices"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id::text = (storage.foldername(name))[1]
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

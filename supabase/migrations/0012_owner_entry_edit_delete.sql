-- Owners can edit and delete their own logged entries, but a garage's
-- verified entry needs to stay immutable from the owner's side or
-- "verified" stops meaning anything. The existing update/delete
-- policies checked ownership only, not verified status, so an owner
-- could already alter or erase a garage's entry via a direct API call
-- even with no UI for it — this tightens both to unverified rows only.
-- MOT history was already read-only for owners aside from the cost
-- field added in 0011, so no change needed there.

drop policy "current owner can edit their service entries" on public.service_entries;

create policy "current owner can edit their own unverified entries"
  on public.service_entries for update
  using (
    not verified
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  )
  with check (
    not verified
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

drop policy "current owner can delete their service entries" on public.service_entries;

create policy "current owner can delete their own unverified entries"
  on public.service_entries for delete
  using (
    not verified
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

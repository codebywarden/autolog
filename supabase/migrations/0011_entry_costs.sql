-- Cost tracking for service entries and MOT tests, to power the
-- cost-over-time insight on the dashboard. numeric(10,2) is exact for
-- money (unlike float) and needs no pence-conversion at every read/write
-- site.

alter table public.service_entries
  add column cost numeric(10,2);

alter table public.mot_history
  add column cost numeric(10,2);

-- mot_history rows are otherwise written only by the service-role import
-- route (see 0001_core_schema.sql) — the DVSA API doesn't return what was
-- actually paid, so an owner has to log that themselves. Scoped the same
-- way as every other owner policy: only rows for a vehicle they currently
-- own, and only via update (the row itself still comes from DVSA import).
create policy "current owner can log a cost against their mot history"
  on public.mot_history for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = mot_history.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  )
  with check (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = mot_history.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

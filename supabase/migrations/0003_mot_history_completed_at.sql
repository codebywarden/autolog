-- test_date (date-only) can't distinguish two MOT tests completed on the
-- same calendar day — e.g. a morning FAIL followed by an afternoon PASS
-- after a same-day repair. DVSA's own motTests array is already ordered
-- correctly by full completedDate, but once two same-day rows land in
-- Postgres, ORDER BY test_date has no defined tie-break and can surface
-- the fail as "latest". Add the full timestamp so ordering is exact.

alter table public.mot_history
  add column completed_at timestamptz;

update public.mot_history
  set completed_at = test_date::timestamptz
  where completed_at is null;

alter table public.mot_history
  alter column completed_at set not null;

create index mot_history_vehicle_completed_at_idx
  on public.mot_history (vehicle_id, completed_at desc);

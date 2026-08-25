-- The garages insert chains .select().single() to get the new row's id
-- back, which makes Postgres filter the RETURNING row through the
-- SELECT policy. The original policy only allowed existing members to
-- view a garage — but the creator's garage_members row is inserted in
-- a separate, later statement, so the brand-new garage wasn't visible
-- to its own creator yet. Postgres raises "new row violates row-level
-- security policy" for a failed RETURNING check, same as a failed
-- WITH CHECK, and rolls back the whole insert.
--
-- Fix: a garage's creator can always see it, membership row or not.

drop policy if exists "member can view their garage" on public.garages;

create policy "member can view their garage"
  on public.garages for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.garage_members gm
      where gm.garage_id = garages.id
        and gm.user_id = auth.uid()
    )
  );

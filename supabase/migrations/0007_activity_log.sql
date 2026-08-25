-- Activity log: an append-only audit trail per vehicle. Writes happen
-- two ways, deliberately not through a plain RLS insert policy:
--
-- 1. SECURITY DEFINER triggers on service_entries and
--    vehicle_garage_access, which fire automatically regardless of
--    which code path performs the write (owner or garage, browser
--    client or future code) — this is the point of doing it at the
--    trigger level rather than hoping every call site remembers to
--    log itself.
-- 2. Two server routes (add-vehicle, redeem-code) insert directly via
--    the service-role client, because those specific writes already
--    happen through service-role (see 0001/0004) and auth.uid() would
--    be null inside a trigger fired by that role.
--
-- No insert policy exists for the authenticated role, so a logged-in
-- user cannot write their own log entries — only the trigger functions
-- and the service-role routes can, which is what makes this a real
-- audit trail rather than a self-reported one.

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  actor_id uuid references auth.users(id),
  -- Denormalised at write time (garage name, or the owner's email) —
  -- auth.users isn't exposed to PostgREST, and a display name resolved
  -- at read time would need a profiles table this app doesn't have yet.
  actor_label text not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_vehicle_id_idx
  on public.activity_log (vehicle_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "current owner can view activity log"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = activity_log.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "garage with access can view activity log"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = activity_log.vehicle_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

-- Trigger: every service entry insert, owner or garage, verified or not.
create or replace function public.log_service_entry_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  label text;
begin
  if new.verified and new.garage_id is not null then
    select name into label from public.garages where id = new.garage_id;
  else
    select email into label from auth.users where id = auth.uid();
  end if;

  insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
  values (
    new.vehicle_id,
    auth.uid(),
    coalesce(label, 'Unknown'),
    case when new.verified then 'verified_entry_added' else 'entry_added' end,
    jsonb_build_object('service_entry_id', new.id, 'service_type', new.service_type)
  );

  return new;
end;
$$;

create trigger service_entries_log_activity
  after insert on public.service_entries
  for each row execute function public.log_service_entry_activity();

-- Trigger: only the revoked_at null -> not null transition, not every
-- update to the row.
create or replace function public.log_garage_access_revoked()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  label text;
begin
  if old.revoked_at is null and new.revoked_at is not null then
    select email into label from auth.users where id = auth.uid();

    insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
    values (
      new.vehicle_id,
      auth.uid(),
      coalesce(label, 'Owner'),
      'garage_access_revoked',
      (select jsonb_build_object('garage_name', g.name) from public.garages g where g.id = new.garage_id)
    );
  end if;

  return new;
end;
$$;

create trigger vehicle_garage_access_log_revoke
  after update on public.vehicle_garage_access
  for each row execute function public.log_garage_access_revoked();

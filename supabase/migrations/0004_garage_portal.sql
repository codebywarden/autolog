-- Phase 2: garage accounts, owner-granted access via invite codes, and
-- verified service entries. Run after 0001-0003.

-- Garages ---------------------------------------------------------------
-- A garage/workshop business, distinct from a vehicle owner account. A
-- user can own personal vehicles AND belong to a garage at the same
-- time — same login, matches the "one app, role-based views" design.
create table public.garages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Garage membership: which users can act on behalf of a garage. MVP
-- keeps this self-service (a user creates a garage and is its only
-- member) — inviting additional staff is a real feature but deferred,
-- not needed for the first slice of the portal.
create table public.garage_members (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (garage_id, user_id)
);

create index garage_members_user_id_idx on public.garage_members (user_id);
create index garage_members_garage_id_idx on public.garage_members (garage_id);

-- Vehicle invite codes ------------------------------------------------------
-- The entire access-grant mechanism: an owner generates a code for
-- their vehicle, hands it to a garage out of band, and redeeming it
-- (via a server route using the service-role key — a one-time code
-- being consumed isn't expressible as a simple RLS policy) creates the
-- vehicle_garage_access row below. No request/approval inbox needed.
create table public.vehicle_invite_codes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by_garage_id uuid references public.garages(id),
  created_at timestamptz not null default now()
);

create index vehicle_invite_codes_vehicle_id_idx on public.vehicle_invite_codes (vehicle_id);

-- Vehicle <-> garage access grants ----------------------------------------
create table public.vehicle_garage_access (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  granted_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (vehicle_id, garage_id)
);

create index vehicle_garage_access_vehicle_id_idx on public.vehicle_garage_access (vehicle_id);
create index vehicle_garage_access_garage_id_idx on public.vehicle_garage_access (garage_id);

-- Tag service entries with the garage that added them ----------------------
alter table public.service_entries
  add column garage_id uuid references public.garages(id);

-- Row level security ------------------------------------------------------
alter table public.garages enable row level security;
alter table public.garage_members enable row level security;
alter table public.vehicle_invite_codes enable row level security;
alter table public.vehicle_garage_access enable row level security;

-- garages: members can view; anyone can create one (self-service signup).
create policy "member can view their garage"
  on public.garages for select
  using (
    exists (
      select 1 from public.garage_members gm
      where gm.garage_id = garages.id
        and gm.user_id = auth.uid()
    )
  );

create policy "authenticated users can create a garage"
  on public.garages for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "member can update their garage"
  on public.garages for update
  using (
    exists (
      select 1 from public.garage_members gm
      where gm.garage_id = garages.id
        and gm.user_id = auth.uid()
    )
  );

-- garage_members: a user can see and create only their own membership.
create policy "user can view own garage membership"
  on public.garage_members for select
  using (user_id = auth.uid());

create policy "user can add themself to a garage"
  on public.garage_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- vehicle_invite_codes: owners manage codes for their own vehicles.
-- No update policy for authenticated — redemption (setting redeemed_at)
-- happens only via the service-role server route.
create policy "current owner can view their invite codes"
  on public.vehicle_invite_codes for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_invite_codes.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can create invite codes"
  on public.vehicle_invite_codes for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_invite_codes.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- vehicle_garage_access: visible to the owner who granted it and the
-- garage it was granted to. No insert policy for authenticated — only
-- created by the service-role redeem-code route.
create policy "owner or garage member can view access grant"
  on public.vehicle_garage_access for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_garage_access.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
    or exists (
      select 1 from public.garage_members gm
      where gm.garage_id = vehicle_garage_access.garage_id
        and gm.user_id = auth.uid()
    )
  );

create policy "current owner can revoke access grant"
  on public.vehicle_garage_access for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_garage_access.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- Extend existing tables so a garage with an active grant can read the
-- vehicle's record and history, and add verified entries of its own.
create policy "garage with access can view vehicle"
  on public.vehicles for select
  using (
    exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = vehicles.id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

create policy "garage with access can view service entries"
  on public.service_entries for select
  using (
    exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = service_entries.vehicle_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

-- A garage can only insert entries marked verified, tagged with its own
-- garage_id, for a vehicle it currently has access to — it can't
-- impersonate the owner or write unverified entries under someone
-- else's name.
create policy "garage with access can add verified service entries"
  on public.service_entries for insert
  to authenticated
  with check (
    verified = true
    and garage_id is not null
    and created_by = auth.uid()
    and exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = service_entries.vehicle_id
        and vga.garage_id = service_entries.garage_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

create policy "garage with access can view mot history"
  on public.mot_history for select
  using (
    exists (
      select 1 from public.vehicle_garage_access vga
      join public.garage_members gm on gm.garage_id = vga.garage_id
      where vga.vehicle_id = mot_history.vehicle_id
        and gm.user_id = auth.uid()
        and vga.revoked_at is null
    )
  );

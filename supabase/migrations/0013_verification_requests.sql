-- Verification requests: an owner asks a garage they've already granted
-- access to (via the invite-code flow in 0004) to verify a self-logged
-- entry after the fact. This is distinct from a garage adding its own
-- verified entry directly — here the entry already exists and belongs
-- to the owner, so approval has to flip verified/garage_id on an
-- existing row rather than insert a new one.

create table public.entry_verification_requests (
  id uuid primary key default gen_random_uuid(),
  service_entry_id uuid not null references public.service_entries(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index entry_verification_requests_vehicle_id_idx
  on public.entry_verification_requests (vehicle_id);
create index entry_verification_requests_service_entry_id_idx
  on public.entry_verification_requests (service_entry_id);
create index entry_verification_requests_garage_pending_idx
  on public.entry_verification_requests (garage_id)
  where status = 'pending';

-- One live request per entry+garage pair — re-requesting after a
-- decline/cancel is fine (that row is no longer 'pending'), but you
-- can't pile up duplicates while one is still open.
create unique index entry_verification_requests_one_pending_per_entry_garage
  on public.entry_verification_requests (service_entry_id, garage_id)
  where status = 'pending';

alter table public.entry_verification_requests enable row level security;

create policy "current owner can view their verification requests"
  on public.entry_verification_requests for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = entry_verification_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "garage member can view requests directed to their garage"
  on public.entry_verification_requests for select
  using (
    exists (
      select 1 from public.garage_members gm
      where gm.garage_id = entry_verification_requests.garage_id
        and gm.user_id = auth.uid()
    )
  );

-- Can only request verification for your own vehicle's still-unverified
-- entry, targeting a garage that currently has an active access grant
-- for that vehicle — can't ask a garage you haven't connected to.
create policy "current owner can request verification"
  on public.entry_verification_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = entry_verification_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
    and exists (
      select 1 from public.service_entries se
      where se.id = entry_verification_requests.service_entry_id
        and se.vehicle_id = entry_verification_requests.vehicle_id
        and not se.verified
    )
    and exists (
      select 1 from public.vehicle_garage_access vga
      where vga.vehicle_id = entry_verification_requests.vehicle_id
        and vga.garage_id = entry_verification_requests.garage_id
        and vga.revoked_at is null
    )
  );

-- Owner can withdraw their own request while it's still pending. Only
-- to 'cancelled' — approving/declining is the garage's call, made
-- through the service-role route below since it also has to flip the
-- linked service_entries row.
create policy "current owner can cancel their pending request"
  on public.entry_verification_requests for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = entry_verification_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  )
  with check (
    status = 'cancelled'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = entry_verification_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

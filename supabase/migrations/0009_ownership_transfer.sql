-- Ownership transfer: the owner generates a one-time code, a new owner
-- redeems it while logged into their own AutoLog account. Redemption
-- (via the service-role route, not RLS — same reasoning as the garage
-- and add-vehicle flows) ends the current owner's vehicle_owners row
-- and starts a new one for the recipient. Every other RLS policy in
-- the app already keys off vehicle_owners.is_current, so the previous
-- owner loses both read and write access the instant that flips —
-- no other policy needs to change for that to be true.

create table public.vehicle_transfer_codes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index vehicle_transfer_codes_vehicle_id_idx on public.vehicle_transfer_codes (vehicle_id);

alter table public.vehicle_transfer_codes enable row level security;

create policy "current owner can view their transfer codes"
  on public.vehicle_transfer_codes for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_transfer_codes.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can create transfer codes"
  on public.vehicle_transfer_codes for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_transfer_codes.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can cancel transfer codes"
  on public.vehicle_transfer_codes for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_transfer_codes.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- Public, token-based, read-only share links for a vehicle's history.
-- Serves both "share with a buyer" (4.1) and "dealership verification"
-- (4.3) with one mechanism, per the product decision to skip a
-- separate account-based dealer portal for MVP — no login required to
-- view.
--
-- Deliberately no SELECT policy permits anonymous token lookups: RLS
-- can't express "anyone holding this exact bearer token" since an
-- anonymous visitor has no auth.uid() at all. The public /share/[token]
-- page validates the token itself via the service-role client instead.

create table public.vehicle_share_links (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index vehicle_share_links_vehicle_id_idx on public.vehicle_share_links (vehicle_id);

alter table public.vehicle_share_links enable row level security;

create policy "current owner can view their share links"
  on public.vehicle_share_links for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_share_links.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can create share links"
  on public.vehicle_share_links for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_share_links.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can revoke share links"
  on public.vehicle_share_links for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicle_share_links.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

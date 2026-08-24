-- AutoLog core schema (MVP): vehicles, ownership, service history, MOT
-- imports, attachments, reminders. Run this in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Vehicles ------------------------------------------------------------
-- One row per physical vehicle, keyed by VRM. Ownership lives in
-- vehicle_owners, not here, so a vehicle can change hands without
-- losing its history.
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vrm text not null unique,
  vin text,
  make text,
  model text,
  colour text,
  fuel_type text,
  engine_size_cc integer,
  manufacture_date date,
  first_used_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Vehicle ownership -----------------------------------------------------
-- Many-to-many so the "sell vehicle" flow (phase 3) can end one owner's
-- row and start another's without deleting history.
create table public.vehicle_owners (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_current boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only one current owner per vehicle at a time.
create unique index vehicle_owners_one_current_per_vehicle
  on public.vehicle_owners (vehicle_id)
  where is_current;

create index vehicle_owners_vehicle_id_idx on public.vehicle_owners (vehicle_id);
create index vehicle_owners_user_id_idx on public.vehicle_owners (user_id) where is_current;

-- Service entries ---------------------------------------------------------
create table public.service_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  entry_date date not null,
  mileage integer,
  service_type text not null default 'service'
    check (service_type in ('service', 'repair', 'tyres', 'brakes', 'battery', 'modification', 'other')),
  garage_name text,
  notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index service_entries_vehicle_id_idx on public.service_entries (vehicle_id);

-- MOT history ---------------------------------------------------------------
-- Imported from the DVLA MOT History API. Not directly user-editable —
-- written only by a server route using the service_role key, which
-- bypasses RLS, so there is deliberately no insert/update policy for
-- the authenticated role below.
create table public.mot_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  mot_test_number text,
  test_date date not null,
  expiry_date date,
  result text not null check (result in ('PASS', 'FAIL')),
  odometer_value integer,
  odometer_unit text check (odometer_unit in ('mi', 'km')),
  raw_data jsonb,
  created_at timestamptz not null default now(),
  unique (vehicle_id, mot_test_number)
);

create index mot_history_vehicle_id_idx on public.mot_history (vehicle_id);

-- File attachments ------------------------------------------------------
-- vehicle_id is denormalised from service_entries so RLS here doesn't
-- need a join through service_entries on every check.
create table public.file_attachments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_entry_id uuid references public.service_entries(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  storage_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create index file_attachments_vehicle_id_idx on public.file_attachments (vehicle_id);
create index file_attachments_service_entry_id_idx on public.file_attachments (service_entry_id);

-- Reminders -----------------------------------------------------------------
-- Computed server-side; owners can view and dismiss but not create them
-- directly (no insert policy for authenticated below).
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check (type in ('mot_due', 'service_due', 'tax_due')),
  due_date date,
  due_mileage integer,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index reminders_vehicle_id_idx on public.reminders (vehicle_id);

-- Row level security ----------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.vehicle_owners enable row level security;
alter table public.service_entries enable row level security;
alter table public.mot_history enable row level security;
alter table public.file_attachments enable row level security;
alter table public.reminders enable row level security;

-- vehicles: only the current owner can see or change the record.
-- Insert is open to any authenticated user because ownership is granted
-- by a follow-up insert into vehicle_owners, gated by the policy below.
create policy "current owner can view vehicle"
  on public.vehicles for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicles.id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "authenticated users can add a vehicle"
  on public.vehicles for insert
  to authenticated
  with check (true);

create policy "current owner can update vehicle"
  on public.vehicles for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = vehicles.id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- vehicle_owners: you can only see and manage your own ownership rows.
create policy "user can view own ownership rows"
  on public.vehicle_owners for select
  using (user_id = auth.uid());

create policy "user can add themself as owner"
  on public.vehicle_owners for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user can end their own ownership"
  on public.vehicle_owners for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- service_entries: current owner has full read/write on their vehicle's log.
create policy "current owner can view service entries"
  on public.service_entries for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can add service entries"
  on public.service_entries for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can edit their service entries"
  on public.service_entries for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can delete their service entries"
  on public.service_entries for delete
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = service_entries.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- mot_history: read-only for owners.
create policy "current owner can view mot history"
  on public.mot_history for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = mot_history.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- file_attachments
create policy "current owner can view attachments"
  on public.file_attachments for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = file_attachments.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can upload attachments"
  on public.file_attachments for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = file_attachments.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can delete attachments"
  on public.file_attachments for delete
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = file_attachments.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- reminders: owners can view and dismiss, not create directly.
create policy "current owner can view reminders"
  on public.reminders for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = reminders.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "current owner can dismiss reminders"
  on public.reminders for update
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = reminders.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  )
  with check (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = reminders.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

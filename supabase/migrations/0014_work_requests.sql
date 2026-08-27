-- Work requests: an owner asks a connected garage (same pool as
-- verification requests — anywhere they've already granted access via
-- an invite code) to book in a piece of work, optionally tied to a
-- specific outstanding MOT advisory. This is scheduling/communication
-- only — the actual work still gets logged afterwards as a normal
-- verified service entry, same as today.

create table public.work_requests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  notes text not null,
  preferred_date date,
  resolved_mot_history_id uuid references public.mot_history(id),
  resolved_defect_index integer,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  scheduled_date date,
  garage_response_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index work_requests_vehicle_id_idx on public.work_requests (vehicle_id);
create index work_requests_garage_pending_idx
  on public.work_requests (garage_id)
  where status = 'pending';

alter table public.work_requests enable row level security;

create policy "current owner can view their work requests"
  on public.work_requests for select
  using (
    exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = work_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "garage member can view work requests sent to their garage"
  on public.work_requests for select
  using (
    exists (
      select 1 from public.garage_members gm
      where gm.garage_id = work_requests.garage_id
        and gm.user_id = auth.uid()
    )
  );

-- Same access rule as verification requests: can only ask a garage that
-- currently has an active grant for this vehicle.
create policy "current owner can request work"
  on public.work_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = work_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
    and exists (
      select 1 from public.vehicle_garage_access vga
      where vga.vehicle_id = work_requests.vehicle_id
        and vga.garage_id = work_requests.garage_id
        and vga.revoked_at is null
    )
  );

-- Owner can withdraw their own request while it's still pending.
create policy "current owner can cancel their pending work request"
  on public.work_requests for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = work_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  )
  with check (
    status = 'cancelled'
    and exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = work_requests.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

-- Garage accepting/declining doesn't need to touch any other table
-- (unlike verification requests, which also flip service_entries), so
-- this is a plain RLS update rather than a service-role route — a
-- garage member can only move a pending request to accepted/declined
-- for their own garage.
create policy "garage member can decide a pending work request"
  on public.work_requests for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.garage_members gm
      where gm.garage_id = work_requests.garage_id
        and gm.user_id = auth.uid()
    )
  )
  with check (
    status in ('accepted', 'declined')
    and exists (
      select 1 from public.garage_members gm
      where gm.garage_id = work_requests.garage_id
        and gm.user_id = auth.uid()
    )
  );

-- Activity log: request raised, and pending -> accepted/declined.
-- Cancelling isn't logged — it's the owner backing out of their own
-- ask, not an event either side needs a record of later.
create or replace function public.log_work_request_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  label text;
begin
  if TG_OP = 'INSERT' then
    select email into label from auth.users where id = new.requested_by;

    insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
    values (
      new.vehicle_id,
      new.requested_by,
      coalesce(label, 'Owner'),
      'work_requested',
      jsonb_build_object('work_request_id', new.id)
    );
  elsif TG_OP = 'UPDATE' and old.status = 'pending' and new.status in ('accepted', 'declined') then
    select name into label from public.garages where id = new.garage_id;

    insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
    values (
      new.vehicle_id,
      auth.uid(),
      coalesce(label, 'Garage'),
      case when new.status = 'accepted' then 'work_accepted' else 'work_declined' end,
      jsonb_build_object('work_request_id', new.id)
    );
  end if;

  return new;
end;
$$;

create trigger work_requests_log_activity
  after insert or update on public.work_requests
  for each row execute function public.log_work_request_activity();

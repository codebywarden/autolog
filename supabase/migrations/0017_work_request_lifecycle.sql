-- Closes the loop from "booked" to "on the record": a garage can now
-- reschedule or cancel a request it already accepted, and can mark one
-- completed — which creates the actual verified service entry (and
-- resolves the same MOT advisory the request was raised against, if
-- any) rather than leaving that as a separate manual step.

alter table public.work_requests
  drop constraint work_requests_status_check;

alter table public.work_requests
  add constraint work_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed'));

alter table public.work_requests
  add column completed_at timestamptz,
  add column resulting_service_entry_id uuid references public.service_entries(id);

-- Reschedule and cancel are plain updates within this one table — no
-- other row needs to change, unlike completing. 'completed' is
-- deliberately left out of what this policy allows: it's only ever set
-- by the service-role route below, which is what actually creates the
-- linked service entry. A client-side update that set status =
-- 'completed' directly would leave a job marked done with nothing on
-- the vehicle's record to show for it.
create policy "garage member can manage an accepted work request"
  on public.work_requests for update
  using (
    status = 'accepted'
    and exists (
      select 1 from public.garage_members gm
      where gm.garage_id = work_requests.garage_id
        and gm.user_id = auth.uid()
    )
  )
  with check (
    status in ('accepted', 'cancelled')
    and exists (
      select 1 from public.garage_members gm
      where gm.garage_id = work_requests.garage_id
        and gm.user_id = auth.uid()
    )
  );

-- Extend the activity trigger from 0014 with one more transition. The
-- resulting verified service entry gets its own "verified_entry_added"
-- log line automatically (its insert trigger from 0007 already fires
-- regardless of which route wrote the row), so completion doesn't need
-- a second entry here — only the cancellation of something the
-- customer was already expecting is worth its own record.
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
  elsif TG_OP = 'UPDATE' and old.status = 'accepted' and new.status = 'cancelled' then
    select name into label from public.garages where id = new.garage_id;

    insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
    values (
      new.vehicle_id,
      auth.uid(),
      coalesce(label, 'Garage'),
      'work_cancelled_by_garage',
      jsonb_build_object('work_request_id', new.id)
    );
  end if;

  return new;
end;
$$;

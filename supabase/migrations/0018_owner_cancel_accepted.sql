-- Owner can also cancel a work request that's already been accepted,
-- not just one still pending — plans change after a job's booked in
-- too. Mirrors 0014's "cancel while pending" policy, scoped to the
-- accepted case instead; deciding (accept/decline) an accepted request
-- back to pending is still not possible, this only ever moves it to
-- cancelled.

create policy "current owner can cancel their accepted work request"
  on public.work_requests for update
  using (
    status = 'accepted'
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

-- The activity trigger (0014, extended in 0017) logged an accepted ->
-- cancelled transition as always garage-initiated, which was true until
-- now. Branch on who's actually making the change so the garage sees
-- an owner backing out just as clearly as the owner sees the reverse.
create or replace function public.log_work_request_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  label text;
  cancelled_by_owner boolean;
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
    select exists (
      select 1 from public.vehicle_owners vo
      where vo.vehicle_id = new.vehicle_id
        and vo.user_id = auth.uid()
        and vo.is_current
    ) into cancelled_by_owner;

    if cancelled_by_owner then
      select email into label from auth.users where id = auth.uid();

      insert into public.activity_log (vehicle_id, actor_id, actor_label, action, detail)
      values (
        new.vehicle_id,
        auth.uid(),
        coalesce(label, 'Owner'),
        'work_cancelled_by_owner',
        jsonb_build_object('work_request_id', new.id)
      );
    else
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
  end if;

  return new;
end;
$$;

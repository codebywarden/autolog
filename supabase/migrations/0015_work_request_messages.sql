-- Two additions to the booking flow from 0014:
--
-- 1. An optional contact_info field the owner can leave on a request —
--    the garage doesn't otherwise have a reliable way to reach the
--    owner directly (auth.users isn't exposed to PostgREST, so there's
--    no email to show them).
-- 2. A lightweight message thread per request, so either side can ask
--    questions, suggest a different date, or just say "see you then"
--    without that having to be the same action as accepting/declining.

alter table public.work_requests
  add column contact_info text;

create table public.work_request_messages (
  id uuid primary key default gen_random_uuid(),
  work_request_id uuid not null references public.work_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('owner', 'garage')),
  -- Denormalised at write time, same reasoning as activity_log.actor_label
  -- (0007) — auth.users isn't queryable via PostgREST and there's no
  -- profiles table to join against instead.
  sender_label text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index work_request_messages_request_id_idx
  on public.work_request_messages (work_request_id, created_at);

alter table public.work_request_messages enable row level security;

create policy "current owner can view messages on their request"
  on public.work_request_messages for select
  using (
    exists (
      select 1 from public.work_requests wr
      join public.vehicle_owners vo on vo.vehicle_id = wr.vehicle_id
      where wr.id = work_request_messages.work_request_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "garage member can view messages on requests sent to their garage"
  on public.work_request_messages for select
  using (
    exists (
      select 1 from public.work_requests wr
      join public.garage_members gm on gm.garage_id = wr.garage_id
      where wr.id = work_request_messages.work_request_id
        and gm.user_id = auth.uid()
    )
  );

create policy "current owner can comment on their request"
  on public.work_request_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'owner'
    and exists (
      select 1 from public.work_requests wr
      join public.vehicle_owners vo on vo.vehicle_id = wr.vehicle_id
      where wr.id = work_request_messages.work_request_id
        and vo.user_id = auth.uid()
        and vo.is_current
    )
  );

create policy "garage member can comment on requests sent to their garage"
  on public.work_request_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'garage'
    and exists (
      select 1 from public.work_requests wr
      join public.garage_members gm on gm.garage_id = wr.garage_id
      where wr.id = work_request_messages.work_request_id
        and gm.user_id = auth.uid()
    )
  );

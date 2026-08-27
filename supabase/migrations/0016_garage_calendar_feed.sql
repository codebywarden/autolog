-- Lets a garage confirm a specific time (not just a date) when accepting
-- a work request, and gives them a subscribable calendar feed of their
-- accepted jobs — garages have their own scheduling tools already, so
-- this is a one-way iCalendar feed to plug into whatever they use
-- rather than a calendar UI built into the app.

alter table public.work_requests
  add column scheduled_time time;

-- High-entropy, not a short code — same reasoning as vehicle_share_links'
-- token (see share-panel.tsx): whoever holds this URL can read the
-- garage's job list with no login step, so it needs to resist guessing
-- on its own. The existing "member can update their garage" policy from
-- 0004 already lets a garage member regenerate this via a plain update,
-- no new policy needed.
alter table public.garages
  add column calendar_feed_token text unique
    default encode(gen_random_bytes(24), 'hex');

alter table public.garages
  alter column calendar_feed_token set not null;

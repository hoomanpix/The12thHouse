-- 30-second listening and platform-click analytics for The12thHouse.
-- Historical play starts are not backfilled as qualified listening views.

create table public.track_view_events (
  track_id uuid not null references public.tracks(id) on delete cascade,
  session_id uuid not null,
  listened_at timestamptz not null default now(),
  primary key (track_id, session_id)
);

create table public.platform_link_click_events (
  id bigint generated always as identity primary key,
  platform_link_id uuid not null references public.platform_links(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index platform_link_click_events_link_clicked_idx
  on public.platform_link_click_events (platform_link_id, clicked_at desc);

alter table public.track_view_events enable row level security;
alter table public.platform_link_click_events enable row level security;

revoke all on table public.track_view_events from public, anon, authenticated;
revoke all on table public.platform_link_click_events from public, anon, authenticated;
grant insert on table public.track_view_events to anon, authenticated;
grant select, insert on table public.track_view_events to authenticated;
grant insert on table public.platform_link_click_events to anon, authenticated;
grant select, insert on table public.platform_link_click_events to authenticated;

create policy track_view_events_insert_published_music
  on public.track_view_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.tracks t
      join public.albums a on a.id = t.album_id
      where t.id = track_view_events.track_id
        and t.published is true
        and a.content_type = 'music'
        and (
          lower(a.status::text) = 'published'
          or (a.status is null and a.published is true)
        )
    )
  );

create policy track_view_events_select_approved_admin
  on public.track_view_events
  for select
  to authenticated
  using ((select public.can_manage_the12thhouse()));

create policy platform_link_click_events_insert_published_music
  on public.platform_link_click_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.platform_links pl
      join public.albums a on a.id = pl.album_id
      where pl.id = platform_link_click_events.platform_link_id
        and a.content_type = 'music'
        and (
          lower(a.status::text) = 'published'
          or (a.status is null and a.published is true)
        )
    )
  );

create policy platform_link_click_events_select_approved_admin
  on public.platform_link_click_events
  for select
  to authenticated
  using ((select public.can_manage_the12thhouse()));

-- The old RPC counted play starts and could be invoked directly, so new qualified
-- analytics use the deduplicated event table rather than mutating the legacy counter.
revoke all on function public.increment_track_play(uuid) from public, anon, authenticated;

create or replace view public.admin_track_view_stats
with (security_invoker = true)
as
  select
    t.id as track_id,
    count(e.session_id)::bigint as qualified_view_count
  from public.tracks t
  join public.albums a on a.id = t.album_id and a.content_type = 'music'
  left join public.track_view_events e on e.track_id = t.id
  group by t.id;

revoke all on public.admin_track_view_stats from public, anon;
grant select on public.admin_track_view_stats to authenticated;

create or replace view public.admin_platform_link_click_stats
with (security_invoker = true)
as
  select
    pl.id as platform_link_id,
    pl.album_id,
    pl.platform,
    pl.label,
    a.title as release_title,
    count(e.id)::bigint as click_count
  from public.platform_links pl
  join public.albums a on a.id = pl.album_id
  left join public.platform_link_click_events e on e.platform_link_id = pl.id
  where a.content_type = 'music'
  group by pl.id, pl.album_id, pl.platform, pl.label, a.title;

revoke all on public.admin_platform_link_click_stats from public, anon;
grant select on public.admin_platform_link_click_stats to authenticated;

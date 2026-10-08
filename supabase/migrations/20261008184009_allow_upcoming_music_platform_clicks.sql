-- Count clicks for music links visible on published and upcoming public release pages.
-- Draft-only links remain ineligible for public click events.

drop policy if exists platform_link_click_events_insert_published_music
  on public.platform_link_click_events;

create policy platform_link_click_events_insert_visible_music
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
          lower(a.status::text) in ('published', 'upcoming')
          or (a.status is null and a.published is true)
        )
    )
  );

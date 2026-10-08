import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261008162103_add_track_listening_analytics.sql');
const migration = readFileSync(migrationPath, 'utf8');
const upcomingClickMigrationPath = resolve(process.cwd(), 'supabase/migrations/20261008184009_allow_upcoming_music_platform_clicks.sql');
const upcomingClickMigration = readFileSync(upcomingClickMigrationPath, 'utf8');

describe('analytics migration security contract', () => {
  it('restricts event reads to the approved administrator and limits writes to published content', () => {
    expect(migration).toContain('track_view_events_select_approved_admin');
    expect(migration).toContain('platform_link_click_events_select_approved_admin');
    expect(migration).toContain('public.can_manage_the12thhouse()');
    expect(migration).toContain("lower(a.status::text) = 'published'");
    expect(migration).toContain('a.status is null and a.published is true');
    expect(migration).toContain('and t.published is true');
  });

  it('deduplicates each track view per anonymous playback session and closes the old direct RPC', () => {
    expect(migration).toContain('primary key (track_id, session_id)');
    expect(migration).toContain('revoke all on function public.increment_track_play(uuid) from public, anon, authenticated');
    expect(migration).toContain('public.admin_track_view_stats');
    expect(migration).toContain('with (security_invoker = true)');
    expect(migration.toLowerCase()).not.toContain('security definer');
  });

  it('aggregates only music tracks and music platform links', () => {
    expect(migration).toMatch(/create or replace view public\.admin_track_view_stats[\s\S]*?join public\.albums a on a\.id = t\.album_id and a\.content_type = 'music'[\s\S]*?group by t\.id;/);
    expect(migration).toMatch(/create or replace view public\.admin_platform_link_click_stats[\s\S]*?where a\.content_type = 'music'[\s\S]*?group by pl\.id,/);
  });

  it('accepts clicks on published and upcoming public music links, but not draft links', () => {
    expect(upcomingClickMigration).toContain('platform_link_click_events_insert_visible_music');
    expect(upcomingClickMigration).toContain("lower(a.status::text) in ('published', 'upcoming')");
    expect(upcomingClickMigration).toContain('a.status is null and a.published is true');
    expect(upcomingClickMigration).toContain("a.content_type = 'music'");
    expect(upcomingClickMigration).not.toContain("lower(a.status::text) = 'draft'");
  });
});

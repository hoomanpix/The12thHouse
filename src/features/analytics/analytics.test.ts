import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordPlatformLinkClick, summarizePlatformClickStats, type PlatformLinkClickStat } from './analytics';

const database = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: database.from },
}));

const stats: PlatformLinkClickStat[] = [
  { platform_link_id: '1', album_id: 'album-1', platform: 'spotify', label: 'Spotify', release_title: 'One', click_count: 11 },
  { platform_link_id: '2', album_id: 'album-1', platform: 'soundcloud', label: 'SoundCloud', release_title: 'One', click_count: '8' },
  { platform_link_id: '3', album_id: 'album-2', platform: 'spotify', label: 'Spotify', release_title: 'Two', click_count: 9 },
];

describe('platform click summaries', () => {
  beforeEach(() => {
    database.from.mockReset().mockReturnValue({ insert: database.insert });
    database.insert.mockReset().mockResolvedValue({ error: null });
  });

  it('records the selected saved-link ID', async () => {
    await recordPlatformLinkClick('platform-link-1');
    expect(database.from).toHaveBeenCalledWith('platform_link_click_events');
    expect(database.insert).toHaveBeenCalledWith({ platform_link_id: 'platform-link-1' });
  });

  it('adds click totals across links and identifies the most-clicked platform', () => {
    expect(summarizePlatformClickStats(stats)).toEqual({
      totalClicks: 28,
      topPlatform: 'spotify',
      topPlatformClicks: 20,
    });
  });

  it('returns a zeroed summary when there are no saved platform links', () => {
    expect(summarizePlatformClickStats([])).toEqual({
      totalClicks: 0,
      topPlatform: '',
      topPlatformClicks: 0,
    });
  });
});

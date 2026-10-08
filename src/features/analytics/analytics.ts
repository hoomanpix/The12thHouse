import { isSupabaseConfigured, supabase } from '../../lib/supabase';

export interface PlatformLinkClickStat {
  platform_link_id: string;
  album_id: string;
  platform: string;
  label: string;
  release_title: string;
  click_count: number | string;
}

export interface TrackViewStat {
  track_id: string;
  qualified_view_count: number | string;
}

const usesLocalMockData = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';

export async function recordPlatformLinkClick(platformLinkId: string): Promise<void> {
  if (!isSupabaseConfigured || usesLocalMockData || !platformLinkId) return;

  try {
    const { error } = await supabase
      .from('platform_link_click_events')
      .insert({ platform_link_id: platformLinkId });
    if (error) console.warn('Platform link click could not be recorded.', error.message);
  } catch (error) {
    console.warn('Platform link click could not be recorded.', error);
  }
}

export async function loadPlatformLinkClickStats(): Promise<{
  data: PlatformLinkClickStat[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || usesLocalMockData) {
    return { data: [], error: usesLocalMockData
      ? 'Analytics are disabled while local mock data is active.'
      : 'Connect Supabase and apply the preview analytics migration to load platform click statistics.' };
  }

  try {
    const { data, error } = await supabase
      .from('admin_platform_link_click_stats')
      .select('platform_link_id, album_id, platform, label, release_title, click_count')
      .order('click_count', { ascending: false })
      .limit(1000);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as PlatformLinkClickStat[], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unable to load platform link statistics.',
    };
  }
}

export async function loadQualifiedTrackViews(): Promise<{
  data: TrackViewStat[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || usesLocalMockData) {
    return { data: [], error: usesLocalMockData
      ? 'Analytics are disabled while local mock data is active.'
      : 'Connect Supabase and apply the preview analytics migration to load qualified track views.' };
  }

  try {
    const { data, error } = await supabase
      .from('admin_track_view_stats')
      .select('track_id, qualified_view_count')
      .limit(1000);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as TrackViewStat[], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unable to load qualified track views.',
    };
  }
}

export function summarizePlatformClickStats(stats: PlatformLinkClickStat[]) {
  const clicksByPlatform = new Map<string, number>();
  let totalClicks = 0;

  for (const stat of stats) {
    const clickCount = Math.max(0, Number(stat.click_count) || 0);
    totalClicks += clickCount;
    clicksByPlatform.set(stat.platform, (clicksByPlatform.get(stat.platform) ?? 0) + clickCount);
  }

  const [topPlatform, topPlatformClicks] = [...clicksByPlatform.entries()]
    .sort((left, right) => right[1] - left[1])[0] ?? ['', 0];

  return { totalClicks, topPlatform, topPlatformClicks };
}

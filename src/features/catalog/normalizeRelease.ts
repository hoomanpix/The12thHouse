import type { PlatformLink, Release, Track } from '../../types';
import { normalizeReleaseStatus } from '../../lib/releaseStatus';

export function normalizeRelease(row: Record<string, any>): Release {
  const {
    content_type: storedContentType,
    contentType: legacyContentType,
    release_type: storedReleaseType,
    type: legacyReleaseType,
    visual_type: storedVisualType,
    visualType: legacyVisualType,
    visual_url: storedVisualUrl,
    tracks: rawTracks,
    platform_links: rawPlatformLinks,
    ...base
  } = row;
  const contentType = storedContentType ?? legacyContentType ?? 'music';
  const common = {
    ...base,
    artist_id: row.artist_id ?? row.created_by ?? 'artist-1',
    contentType,
    artwork_url: row.artwork_url ?? row.cover_url ?? null,
    release_date: row.release_date ?? null,
    status: normalizeReleaseStatus(row.status, Boolean(row.published), row.release_date ?? null),
    show_release_date: row.show_release_date !== false,
  };

  if (contentType === 'visual') {
    const visualType = storedVisualType ?? legacyVisualType ?? 'cover';
    return {
      ...common,
      visualType,
      ...(visualType === 'animation' ? { visual_url: storedVisualUrl ?? null } : {}),
    } as Release;
  }

  const tracks = (rawTracks ?? []).map((track: Record<string, any>) => {
    const { track_order: storedOrder, order: legacyOrder, ...metadata } = track;
    delete metadata.duration;
    return {
      ...metadata,
      release_id: track.release_id ?? track.album_id,
      order: storedOrder ?? legacyOrder ?? 1,
    } as Track;
  }).sort((a: Track, b: Track) => a.order - b.order);
  const platform_links = (rawPlatformLinks ?? []).map((link: Record<string, any>) => {
    const { link_order: storedOrder, order: legacyOrder, ...metadata } = link;
    return { ...metadata, order: storedOrder ?? legacyOrder ?? 1 } as PlatformLink;
  }).sort((a: PlatformLink, b: PlatformLink) => a.order - b.order);

  return {
    ...common,
    type: storedReleaseType ?? legacyReleaseType ?? 'album',
    tracks,
    platform_links,
  } as Release;
}

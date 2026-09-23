import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockArtist, mockReleases } from '../../data/mock';
import type { Artist, PlatformLink, Release, Track } from '../../types';

const storageKey = 'new-wave-catalog';

interface CatalogContextValue {
  artist: Artist;
  releases: Release[];
  updateRelease: (releaseId: string, update: Partial<Release>) => void;
  addTrack: (releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => void;
  removeTrack: (releaseId: string, trackId: string) => void;
  updateTrack: (releaseId: string, trackId: string, update: Partial<Track>) => void;
  addPlatformLink: (releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => void;
  updatePlatformLink: (releaseId: string, linkId: string, update: Partial<PlatformLink>) => void;
  removePlatformLink: (releaseId: string, linkId: string) => void;
  recordPlay: (releaseId: string, trackId: string) => void;
  resetCatalog: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function normalizeReleases(releases: Release[]) {
  return releases.map((release) => ({ ...release, contentType: release.contentType ?? 'music' }));
}

function mergeSeedReleases(savedReleases: Release[]) {
  const savedById = new Map(savedReleases.map((release) => [release.id, release]));
  const seeded = (mockReleases as Release[]).map((seed) => {
    const saved = savedById.get(seed.id);
    if (!saved) return seed;

    // Keep Admin metadata edits, but always refresh the seed artwork/title when a new cover ships.
    const artworkChanged = seed.artwork_url && saved.artwork_url !== seed.artwork_url;
    const titleChanged = seed.id === 'release-2' && saved.title === 'Low Tide Memory';
    return {
      ...seed,
      ...saved,
      ...(artworkChanged ? { artwork_url: seed.artwork_url } : {}),
      ...(titleChanged ? { title: seed.title, slug: seed.slug, tracks: seed.tracks } : {}),
    };
  });
  const seededIds = new Set(seeded.map((release) => release.id));
  return [...seeded, ...savedReleases.filter((release) => !seededIds.has(release.id))];
}

function getInitialReleases() {
  if (typeof window === 'undefined') return normalizeReleases(mockReleases as Release[]);
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return normalizeReleases(mockReleases as Release[]);

  try {
    return normalizeReleases(mergeSeedReleases(JSON.parse(saved) as Release[]));
  } catch {
    return normalizeReleases(mockReleases as Release[]);
  }
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [releases, setReleases] = useState<Release[]>(getInitialReleases);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(releases));
  }, [releases]);

  const updateRelease = useCallback((releaseId: string, update: Partial<Release>) => {
    setReleases((current) => current.map((release) => (release.id === releaseId ? { ...release, ...update } : release)));
  }, []);

  const addTrack = useCallback((releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => {
    setReleases((current) =>
      current.map((release) => {
        if (release.id !== releaseId) return release;
        const tracks = release.tracks ?? [];
        return {
          ...release,
          tracks: [
            ...tracks,
            { ...track, id: `track-${Date.now()}`, release_id: releaseId, order: tracks.length + 1 },
          ],
        };
      }),
    );
  }, []);

  const removeTrack = useCallback((releaseId: string, trackId: string) => {
    setReleases((current) =>
      current.map((release) =>
        release.id === releaseId
          ? { ...release, tracks: (release.tracks ?? []).filter((track) => track.id !== trackId) }
          : release,
      ),
    );
  }, []);

  const updateTrack = useCallback((releaseId: string, trackId: string, update: Partial<Track>) => {
    setReleases((current) =>
      current.map((release) =>
        release.id === releaseId
          ? {
              ...release,
              tracks: (release.tracks ?? []).map((track) => (track.id === trackId ? { ...track, ...update } : track)),
            }
          : release,
      ),
    );
  }, []);

  const addPlatformLink = useCallback((releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => {
    setReleases((current) =>
      current.map((release) => {
        if (release.id !== releaseId) return release;
        const links = release.platform_links ?? [];
        return {
          ...release,
          platform_links: [...links, { ...link, id: `link-${Date.now()}`, order: links.length + 1 }],
        };
      }),
    );
  }, []);

  const updatePlatformLink = useCallback((releaseId: string, linkId: string, update: Partial<PlatformLink>) => {
    setReleases((current) =>
      current.map((release) =>
        release.id === releaseId
          ? {
              ...release,
              platform_links: (release.platform_links ?? []).map((link) =>
                link.id === linkId ? { ...link, ...update } : link,
              ),
            }
          : release,
      ),
    );
  }, []);

  const removePlatformLink = useCallback((releaseId: string, linkId: string) => {
    setReleases((current) =>
      current.map((release) =>
        release.id === releaseId
          ? { ...release, platform_links: (release.platform_links ?? []).filter((link) => link.id !== linkId) }
          : release,
      ),
    );
  }, []);

  const recordPlay = useCallback((releaseId: string, trackId: string) => {
    setReleases((current) =>
      current.map((release) =>
        release.id === releaseId
          ? {
              ...release,
              tracks: (release.tracks ?? []).map((track) =>
                track.id === trackId ? { ...track, play_count: (track.play_count ?? 0) + 1 } : track,
              ),
            }
          : release,
      ),
    );
  }, []);

  const resetCatalog = useCallback(() => setReleases(normalizeReleases(mockReleases as Release[])), []);

  const value = useMemo(
    () => ({
      artist: mockArtist as Artist,
      releases,
      updateRelease,
      addTrack,
      removeTrack,
      updateTrack,
      addPlatformLink,
      updatePlatformLink,
      removePlatformLink,
      recordPlay,
      resetCatalog,
    }),
    [
      releases,
      updateRelease,
      addTrack,
      removeTrack,
      updateTrack,
      addPlatformLink,
      updatePlatformLink,
      removePlatformLink,
      recordPlay,
      resetCatalog,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}

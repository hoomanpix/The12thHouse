import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockArtist, mockReleases } from '../../data/mock';
import type { Artist, PlatformLink, Release, Track } from '../../types';

const storageKey = 'new-wave-catalog';
const homeCardsStorageKey = 'new-wave-home-cards';
const upcomingStorageKey = 'new-wave-upcoming-releases';

interface CatalogContextValue {
  artist: Artist;
  releases: Release[];
  upcomingReleases: Release[];
  homeCardIds: string[];
  updateRelease: (releaseId: string, update: Partial<Release>) => void;
  addRelease: (release: Omit<Release, 'id' | 'created_at' | 'updated_at'>) => string;
  addUpcomingRelease: (release: Omit<Release, 'id' | 'created_at' | 'updated_at'>) => string;
  updateUpcomingRelease: (releaseId: string, update: Partial<Release>) => void;
  publishUpcomingRelease: (releaseId: string) => string | null;
  removeUpcomingRelease: (releaseId: string) => void;
  updateHomeCard: (slot: number, releaseId: string) => void;
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

function getInitialHomeCardIds() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(homeCardsStorageKey) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function getInitialUpcomingReleases() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(upcomingStorageKey) ?? '[]');
    return Array.isArray(saved) ? normalizeReleases(saved as Release[]) : [];
  } catch {
    return [];
  }
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [releases, setReleases] = useState<Release[]>(getInitialReleases);
  const [upcomingReleases, setUpcomingReleases] = useState<Release[]>(getInitialUpcomingReleases);
  const [homeCardIds, setHomeCardIds] = useState<string[]>(getInitialHomeCardIds);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(releases));
  }, [releases]);

  useEffect(() => {
    window.localStorage.setItem(homeCardsStorageKey, JSON.stringify(homeCardIds));
  }, [homeCardIds]);

  useEffect(() => {
    window.localStorage.setItem(upcomingStorageKey, JSON.stringify(upcomingReleases));
  }, [upcomingReleases]);

  useEffect(() => {
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          setReleases(normalizeReleases(mergeSeedReleases(JSON.parse(event.newValue) as Release[])));
        } catch {
          // Ignore malformed data from another tab and keep the current catalog.
        }
      }
      if (event.key === homeCardsStorageKey && event.newValue) {
        try {
          const next = JSON.parse(event.newValue);
          if (Array.isArray(next)) setHomeCardIds(next.filter((id): id is string => typeof id === 'string'));
        } catch {
          // Ignore malformed home-card data from another tab.
        }
      }
      if (event.key === upcomingStorageKey && event.newValue) {
        try {
          const next = JSON.parse(event.newValue);
          if (Array.isArray(next)) setUpcomingReleases(normalizeReleases(next as Release[]));
        } catch {
          // Ignore malformed draft data from another tab.
        }
      }
    };

    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  const updateRelease = useCallback((releaseId: string, update: Partial<Release>) => {
    setReleases((current) => current.map((release) => (release.id === releaseId ? { ...release, ...update } : release)));
  }, []);

  const addRelease = useCallback((release: Omit<Release, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `release-${Date.now()}`;
    setReleases((current) => [...current, { ...release, id, tracks: (release.tracks ?? []).map((track) => ({ ...track, release_id: id })) }]);
    return id;
  }, []);

  const addUpcomingRelease = useCallback((release: Omit<Release, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `upcoming-${Date.now()}`;
    setUpcomingReleases((current) => [...current, { ...release, id, published: false, tracks: (release.tracks ?? []).map((track) => ({ ...track, release_id: id })) }]);
    return id;
  }, []);

  const updateUpcomingRelease = useCallback((releaseId: string, update: Partial<Release>) => {
    setUpcomingReleases((current) => current.map((release) => release.id === releaseId ? { ...release, ...update } : release));
  }, []);

  const publishUpcomingRelease = useCallback((releaseId: string) => {
    let publishedId: string | null = null;
    setUpcomingReleases((current) => current.filter((release) => {
      if (release.id !== releaseId) return true;
      publishedId = `release-${Date.now()}`;
      setReleases((catalog) => [...catalog, { ...release, id: publishedId as string, published: true, tracks: (release.tracks ?? []).map((track) => ({ ...track, release_id: publishedId as string })) }]);
      return false;
    }));
    return publishedId;
  }, []);

  const removeUpcomingRelease = useCallback((releaseId: string) => {
    setUpcomingReleases((current) => current.filter((release) => release.id !== releaseId));
  }, []);

  const updateHomeCard = useCallback((slot: number, releaseId: string) => {
    setHomeCardIds((current) => {
      const next = [...current];
      next[slot] = releaseId;
      return next;
    });
  }, []);

  const addTrack = useCallback((releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => {
    setReleases((current) => current.map((release) => {
      if (release.id !== releaseId) return release;
      const tracks = release.tracks ?? [];
      return { ...release, tracks: [...tracks, { ...track, id: `track-${Date.now()}`, release_id: releaseId, order: tracks.length + 1 }] };
    }));
  }, []);

  const removeTrack = useCallback((releaseId: string, trackId: string) => {
    setReleases((current) => current.map((release) => release.id === releaseId
      ? { ...release, tracks: (release.tracks ?? []).filter((track) => track.id !== trackId) }
      : release));
  }, []);

  const updateTrack = useCallback((releaseId: string, trackId: string, update: Partial<Track>) => {
    setReleases((current) => current.map((release) => release.id === releaseId
      ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, ...update } : track) }
      : release));
  }, []);

  const addPlatformLink = useCallback((releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => {
    setReleases((current) => current.map((release) => {
      if (release.id !== releaseId) return release;
      const links = release.platform_links ?? [];
      return { ...release, platform_links: [...links, { ...link, id: `link-${Date.now()}`, order: links.length + 1 }] };
    }));
  }, []);

  const updatePlatformLink = useCallback((releaseId: string, linkId: string, update: Partial<PlatformLink>) => {
    setReleases((current) => current.map((release) => release.id === releaseId
      ? { ...release, platform_links: (release.platform_links ?? []).map((link) => link.id === linkId ? { ...link, ...update } : link) }
      : release));
  }, []);

  const removePlatformLink = useCallback((releaseId: string, linkId: string) => {
    setReleases((current) => current.map((release) => release.id === releaseId
      ? { ...release, platform_links: (release.platform_links ?? []).filter((link) => link.id !== linkId) }
      : release));
  }, []);

  const recordPlay = useCallback((releaseId: string, trackId: string) => {
    setReleases((current) => current.map((release) => release.id === releaseId
      ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, play_count: (track.play_count ?? 0) + 1 } : track) }
      : release));
  }, []);

  const resetCatalog = useCallback(() => {
    setReleases(normalizeReleases(mockReleases as Release[]));
    setHomeCardIds([]);
  }, []);

  const value = useMemo(() => ({
    artist: mockArtist as Artist,
    releases,
    upcomingReleases,
    homeCardIds,
    updateRelease,
    addRelease,
    addUpcomingRelease,
    updateUpcomingRelease,
    publishUpcomingRelease,
    removeUpcomingRelease,
    updateHomeCard,
    addTrack,
    removeTrack,
    updateTrack,
    addPlatformLink,
    updatePlatformLink,
    removePlatformLink,
    recordPlay,
    resetCatalog,
  }), [releases, upcomingReleases, homeCardIds, updateRelease, addRelease, addUpcomingRelease, updateUpcomingRelease, publishUpcomingRelease, removeUpcomingRelease, updateHomeCard, addTrack, removeTrack, updateTrack, addPlatformLink, updatePlatformLink, removePlatformLink, recordPlay, resetCatalog]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}

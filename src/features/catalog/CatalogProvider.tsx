import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockArtist, mockReleases } from '../../data/mock';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Artist, PlatformLink, Release, Track } from '../../types';

type ReleaseInput = Omit<Release, 'id' | 'created_at' | 'updated_at'>;
interface CatalogContextValue {
  artist: Artist;
  releases: Release[];
  upcomingReleases: Release[];
  homeCardIds: string[];
  user: { id: string; email?: string } | null;
  isRecoveringPassword: boolean;
  isReady: boolean;
  isRemote: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateRelease: (releaseId: string, update: Partial<Release>) => void;
  addRelease: (release: ReleaseInput) => string;
  addUpcomingRelease: (release: ReleaseInput) => string;
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
const fallbackReleases = mockReleases as Release[];
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0')}`;

function normalizeRelease(row: any): Release {
  return {
    ...row,
    artist_id: row.artist_id ?? row.created_by ?? 'artist-1',
    type: row.release_type ?? row.type ?? 'album',
    contentType: row.content_type ?? row.contentType ?? 'music',
    visualType: row.visual_type ?? row.visualType,
    artwork_url: row.artwork_url ?? row.cover_url ?? null,
    visual_url: row.visual_url ?? null,
    tracks: (row.tracks ?? []).map((track: any) => ({ ...track, release_id: track.release_id ?? track.album_id, duration: track.duration ?? 0, order: track.track_order ?? track.order ?? 1 })),
    platform_links: (row.platform_links ?? []).map((link: any) => ({ ...link, order: link.link_order ?? link.order ?? 1 })),
  };
}

function releaseRow(release: Partial<Release>) {
  const row: Record<string, unknown> = {};
  const fields: Array<[keyof Release, string]> = [
    ['title', 'title'], ['slug', 'slug'], ['release_date', 'release_date'], ['description', 'description'],
    ['featured', 'featured'], ['published', 'published'], ['visual_url', 'visual_url'],
  ];
  fields.forEach(([from, to]) => { if (from in release) row[to] = release[from]; });
  if ('type' in release) row.release_type = release.type;
  if ('artwork_url' in release) row.cover_url = release.artwork_url;
  if ('contentType' in release) row.content_type = release.contentType;
  if ('visualType' in release) row.visual_type = release.visualType;
  return row;
}

function trackRow(releaseId: string, track: Partial<Track>) {
  return { album_id: releaseId, title: track.title, audio_url: track.audio_url ?? null, published: track.published ?? false, play_count: track.play_count ?? 0, track_order: track.order ?? 1 };
}

function linkRow(releaseId: string, link: Partial<PlatformLink>) {
  return { album_id: releaseId, platform: link.platform, label: link.label, url: link.url, link_order: link.order ?? 1 };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [artist] = useState<Artist>(mockArtist as Artist);
  const [releases, setReleases] = useState<Release[]>(fallbackReleases);
  const [homeCardIds, setHomeCardIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  const loadRemote = useCallback(async (authenticated = false) => {
    if (!isSupabaseConfigured) { setIsReady(true); return; }
    const query = supabase.from('albums').select('*, tracks(*), platform_links(*)').order('release_date', { ascending: false });
    const { data, error } = await query;
    if (!error && data) setReleases(data.map(normalizeRelease));
    const cards = await supabase.from('home_cards').select('slot, album_id').order('slot');
    if (!cards.error && cards.data) setHomeCardIds(cards.data.map((card) => card.album_id).filter((id): id is string => Boolean(id)));
    if (authenticated) {
      const current = await supabase.auth.getUser();
      if (current.data.user) setUser({ id: current.data.user.id, email: current.data.user.email });
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session?.user) setUser({ id: data.session.user.id, email: data.session.user.email });
      loadRemote(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (session?.user) { setUser({ id: session.user.id, email: session.user.email }); loadRemote(true); }
      else setUser(null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadRemote]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== 'kamielkhajehpour@gmail.com') return { error: 'Only the approved artist email can access the admin panel.' };
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { error: error.message };
    await loadRemote(true);
    return {};
  }, [loadRemote]);

  const signUp = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== 'kamielkhajehpour@gmail.com') return { error: 'Only the approved artist email can create the artist account.' };
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) return { error: error.message };
    if (data.user && !data.session) return { error: 'Account created. Check your email for confirmation, then sign in.' };
    return {};
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== 'kamielkhajehpour@gmail.com') return { error: 'Only the approved artist email can reset the admin password.' };
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: 'https://hoomanpix.github.io/The12thHouse/' });
    return error ? { error: error.message } : {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsRecoveringPassword(false);
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setUser(null); }, []);

  const updateRelease = useCallback((releaseId: string, update: Partial<Release>) => {
    setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, ...update } : release));
    if (isSupabaseConfigured) void supabase.from('albums').update(releaseRow(update)).eq('id', releaseId);
  }, []);

  const addRelease = useCallback((release: ReleaseInput) => {
    const id = makeId();
    const next = { ...release, id, tracks: (release.tracks ?? []).map((track) => ({ ...track, id: makeId(), release_id: id })), platform_links: (release.platform_links ?? []).map((link) => ({ ...link, id: makeId(), release_id: id })) } as Release;
    setReleases((current) => [...current, next]);
    if (isSupabaseConfigured) {
      void supabase.from('albums').insert({ id, ...releaseRow(release) });
      void Promise.all((next.tracks ?? []).map((track) => supabase.from('tracks').insert({ id: track.id, ...trackRow(id, track) })));
      void Promise.all((next.platform_links ?? []).map((link) => supabase.from('platform_links').insert({ id: link.id, ...linkRow(id, link) })));
    }
    return id;
  }, []);

  const addUpcomingRelease = useCallback((release: ReleaseInput) => addRelease({ ...release, published: false }), [addRelease]);

  const updateUpcomingRelease = useCallback((releaseId: string, update: Partial<Release>) => updateRelease(releaseId, update), [updateRelease]);
  const publishUpcomingRelease = useCallback((releaseId: string) => { updateRelease(releaseId, { published: true }); return releaseId; }, [updateRelease]);
  const removeUpcomingRelease = useCallback((releaseId: string) => { setReleases((current) => current.filter((release) => release.id !== releaseId)); if (isSupabaseConfigured) void supabase.from('albums').delete().eq('id', releaseId); }, []);

  const updateHomeCard = useCallback((slot: number, releaseId: string) => {
    setHomeCardIds((current) => { const next = [...current]; next[slot] = releaseId; return next; });
    if (isSupabaseConfigured) void supabase.from('home_cards').upsert({ slot, album_id: releaseId }, { onConflict: 'slot' });
  }, []);

  const addTrack = useCallback((releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => {
    const id = makeId();
    setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: [...(release.tracks ?? []), { ...track, id, release_id: releaseId, order: (release.tracks ?? []).length + 1 }] } : release));
    if (isSupabaseConfigured) void supabase.from('tracks').insert({ id, ...trackRow(releaseId, { ...track, order: 1 }) });
  }, []);

  const removeTrack = useCallback((releaseId: string, trackId: string) => { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).filter((track) => track.id !== trackId) } : release)); if (isSupabaseConfigured) void supabase.from('tracks').delete().eq('id', trackId); }, []);
  const updateTrack = useCallback((releaseId: string, trackId: string, update: Partial<Track>) => { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, ...update } : track) } : release)); if (isSupabaseConfigured) void supabase.from('tracks').update(trackRow(releaseId, update)).eq('id', trackId); }, []);

  const addPlatformLink = useCallback((releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => { const id = makeId(); setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, platform_links: [...(release.platform_links ?? []), { ...link, id, order: (release.platform_links ?? []).length + 1 }] } : release)); if (isSupabaseConfigured) void supabase.from('platform_links').insert({ id, ...linkRow(releaseId, { ...link, order: 1 }) }); }, []);
  const updatePlatformLink = useCallback((releaseId: string, linkId: string, update: Partial<PlatformLink>) => { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, platform_links: (release.platform_links ?? []).map((link) => link.id === linkId ? { ...link, ...update } : link) } : release)); if (isSupabaseConfigured) void supabase.from('platform_links').update(linkRow(releaseId, update)).eq('id', linkId); }, []);
  const removePlatformLink = useCallback((releaseId: string, linkId: string) => { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, platform_links: (release.platform_links ?? []).filter((link) => link.id !== linkId) } : release)); if (isSupabaseConfigured) void supabase.from('platform_links').delete().eq('id', linkId); }, []);
  const recordPlay = useCallback((releaseId: string, trackId: string) => { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, play_count: (track.play_count ?? 0) + 1 } : track) } : release)); if (isSupabaseConfigured) void supabase.rpc('increment_track_play', { p_track_id: trackId }); }, []);
  const resetCatalog = useCallback(() => setReleases(fallbackReleases), []);

  const value = useMemo(() => ({ artist, releases, upcomingReleases: releases.filter((release) => !release.published), homeCardIds, user, isRecoveringPassword, isReady, isRemote: isSupabaseConfigured, signIn, signUp, resetPassword, updatePassword, signOut, updateRelease, addRelease, addUpcomingRelease, updateUpcomingRelease, publishUpcomingRelease, removeUpcomingRelease, updateHomeCard, addTrack, removeTrack, updateTrack, addPlatformLink, updatePlatformLink, removePlatformLink, recordPlay, resetCatalog }), [artist, releases, homeCardIds, user, isRecoveringPassword, isReady, signIn, signUp, resetPassword, updatePassword, signOut, updateRelease, addRelease, addUpcomingRelease, updateUpcomingRelease, publishUpcomingRelease, removeUpcomingRelease, updateHomeCard, addTrack, removeTrack, updateTrack, addPlatformLink, updatePlatformLink, removePlatformLink, recordPlay, resetCatalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}

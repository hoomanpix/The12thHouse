import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockArtist, mockReleases } from '../../data/mock';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Artist, PlatformLink, Release, Track } from '../../types';
import { normalizeReleaseStatus } from '../../lib/releaseStatus';

type ReleaseInput = Omit<Release, 'id' | 'created_at' | 'updated_at'>;
type MutationResult = { error?: string };
type CreateReleaseResult = MutationResult & { id?: string };

interface CatalogContextValue {
  artist: Artist;
  releases: Release[];
  upcomingReleases: Release[];
  homeCardIds: string[];
  user: { id: string; email?: string } | null;
  isRecoveringPassword: boolean;
  isReady: boolean;
  isRemote: boolean;
  signIn: (email: string, password: string) => Promise<MutationResult>;
  signUp: (email: string, password: string) => Promise<MutationResult>;
  resetPassword: (email: string) => Promise<MutationResult>;
  updatePassword: (password: string) => Promise<MutationResult>;
  signOut: () => Promise<void>;
  reloadCatalog: () => Promise<MutationResult>;
  updateRelease: (releaseId: string, update: Partial<Release>) => Promise<MutationResult>;
  addRelease: (release: ReleaseInput) => Promise<CreateReleaseResult>;
  removeRelease: (releaseId: string) => Promise<MutationResult>;
  updateHomeCard: (slot: number, releaseId: string) => Promise<MutationResult>;
  addTrack: (releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => Promise<MutationResult & { id?: string }>;
  removeTrack: (releaseId: string, trackId: string) => Promise<MutationResult>;
  updateTrack: (releaseId: string, trackId: string, update: Partial<Track>) => Promise<MutationResult>;
  saveTrackOrder: (releaseId: string, trackIds: string[]) => Promise<MutationResult>;
  saveArtwork: (releaseId: string, file: File) => Promise<MutationResult>;
  removeArtwork: (releaseId: string) => Promise<MutationResult>;
  saveTrackAudio: (releaseId: string, trackId: string, file: File) => Promise<MutationResult>;
  removeTrackAudio: (releaseId: string, trackId: string) => Promise<MutationResult>;
  saveVisualMedia: (releaseId: string, file: File) => Promise<MutationResult>;
  removeVisualMedia: (releaseId: string) => Promise<MutationResult>;
  addPlatformLink: (releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => Promise<MutationResult & { id?: string }>;
  updatePlatformLink: (releaseId: string, linkId: string, update: Partial<PlatformLink>) => Promise<MutationResult>;
  removePlatformLink: (releaseId: string, linkId: string) => Promise<MutationResult>;
  recordPlay: (releaseId: string, trackId: string) => void;
  resetCatalog: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);
const fallbackReleases = mockReleases as Release[];
const approvedAdminEmail = 'kamielkhajehpour@gmail.com';
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0')}`;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown backend error');
}

function normalizeRelease(row: any): Release {
  return {
    ...row,
    artist_id: row.artist_id ?? row.created_by ?? 'artist-1',
    type: row.release_type ?? row.type ?? 'album',
    contentType: row.content_type ?? row.contentType ?? 'music',
    visualType: row.visual_type ?? row.visualType,
    artwork_url: row.artwork_url ?? row.cover_url ?? null,
    visual_url: row.visual_url ?? null,
    release_date: row.release_date ?? null,
    status: normalizeReleaseStatus(row.status, Boolean(row.published), row.release_date ?? null),
    show_release_date: row.show_release_date !== false,
    tracks: (row.tracks ?? []).map((track: any) => ({
      ...track,
      release_id: track.release_id ?? track.album_id,
      duration: track.duration ?? 0,
      order: track.track_order ?? track.order ?? 1,
    })).sort((a: Track, b: Track) => a.order - b.order),
    platform_links: (row.platform_links ?? []).map((link: any) => ({
      ...link,
      order: link.link_order ?? link.order ?? 1,
    })).sort((a: PlatformLink, b: PlatformLink) => a.order - b.order),
  };
}

function releaseRow(release: Partial<Release>) {
  const row: Record<string, unknown> = {};
  const fields: Array<[keyof Release, string]> = [
    ['title', 'title'], ['slug', 'slug'], ['release_date', 'release_date'], ['description', 'description'],
    ['featured', 'featured'], ['published', 'published'], ['status', 'status'], ['show_release_date', 'show_release_date'], ['visual_url', 'visual_url'],
  ];
  fields.forEach(([from, to]) => { if (from in release) row[to] = release[from]; });
  if ('type' in release) row.release_type = release.type;
  if ('artwork_url' in release) row.cover_url = release.artwork_url;
  if ('contentType' in release) row.content_type = release.contentType;
  if ('visualType' in release) row.visual_type = release.visualType;
  return row;
}

function trackRow(releaseId: string, track: Partial<Track>) {
  const row: Record<string, unknown> = { album_id: releaseId };
  if ('title' in track) row.title = track.title;
  if ('audio_url' in track) row.audio_url = track.audio_url;
  if ('published' in track) row.published = track.published;
  if ('play_count' in track) row.play_count = track.play_count;
  if ('order' in track) row.track_order = track.order;
  return row;
}

function linkRow(releaseId: string, link: Partial<PlatformLink>) {
  const row: Record<string, unknown> = { album_id: releaseId };
  if ('platform' in link) row.platform = link.platform;
  if ('label' in link) row.label = link.label;
  if ('url' in link) row.url = link.url;
  if ('order' in link) row.link_order = link.order;
  return row;
}

function storagePathFromReference(reference: string | null | undefined, bucket: string) {
  if (!reference) return null;
  const marker = `/${bucket}/`;
  const index = reference.indexOf(marker);
  return index >= 0 ? reference.slice(index + marker.length).split('?')[0] : (reference.startsWith(`${bucket}/`) ? reference.slice(bucket.length + 1) : null);
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [artist] = useState<Artist>(mockArtist as Artist);
  const [releases, setReleases] = useState<Release[]>(fallbackReleases);
  const [homeCardIds, setHomeCardIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hashParams.get('type') === 'recovery' || new URLSearchParams(window.location.search).get('type') === 'recovery';
  });
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  const resolveAudioReferences = useCallback(async (items: Release[]) => {
    if (!isSupabaseConfigured) return items;
    const resolved = await Promise.all(items.map(async (release) => {
      const tracks = await Promise.all((release.tracks ?? []).map(async (track) => {
        if (!track.audio_url || track.audio_url.startsWith('http')) return track;
        const reference = track.audio_url;
        const { data, error } = await supabase.storage.from('audio').createSignedUrl(reference, 3600);
        if (error || !data?.signedUrl) return { ...track, audio_reference: reference, audio_error: error?.message ?? 'Unable to create a playback URL.' };
        return { ...track, audio_reference: reference, audio_url: data.signedUrl, audio_error: null };
      }));
      return { ...release, tracks };
    }));
    return resolved;
  }, []);

  const loadRemote = useCallback(async (authenticated = false): Promise<MutationResult> => {
    if (!isSupabaseConfigured) { setIsReady(true); return {}; }
    try {
      const { data, error } = await supabase.from('albums').select('*, tracks(*), platform_links(*)').order('release_date', { ascending: false, nullsFirst: false });
      if (error) { setIsReady(true); return { error: error.message }; }
      const normalized = await resolveAudioReferences((data ?? []).map(normalizeRelease));
      setReleases(normalized);
      const cards = await supabase.from('home_cards').select('slot, album_id').order('slot');
      if (cards.error) { setIsReady(true); return { error: cards.error.message }; }
      const slots = Array.from({ length: 3 }, () => '');
      (cards.data ?? []).forEach((card) => { if (card.slot >= 0 && card.slot < slots.length) slots[card.slot] = card.album_id ?? ''; });
      setHomeCardIds(slots);
      if (authenticated) {
        const current = await supabase.auth.getUser();
        if (current.error) { setIsReady(true); return { error: current.error.message }; }
        if (current.data.user) setUser({ id: current.data.user.id, email: current.data.user.email });
      }
      setIsReady(true);
      return {};
    } catch (error) {
      setIsReady(true);
      return { error: errorMessage(error) };
    }
  }, [resolveAudioReferences]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (!error && data.session?.user) setUser({ id: data.session.user.id, email: data.session.user.email });
      void loadRemote(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (session?.user) { setUser({ id: session.user.id, email: session.user.email }); void loadRemote(true); }
      else setUser(null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadRemote]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== approvedAdminEmail) return { error: 'Only the approved artist email can access the admin panel.' };
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { error: error.message };
    return loadRemote(true);
  }, [loadRemote]);

  const signUp = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== approvedAdminEmail) return { error: 'Only the approved artist email can create the artist account.' };
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (error) return { error: error.message };
    if (data.user && !data.session) return { error: 'Account created. Check your email for confirmation, then sign in.' };
    return {};
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== approvedAdminEmail) return { error: 'Only the approved artist email can reset the admin password.' };
    const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || new URL(`${import.meta.env.BASE_URL}#/admin/change-password`, window.location.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    return error ? { error: error.message } : {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) { setIsRecoveringPassword(false); window.history.replaceState(null, '', `${window.location.pathname}#/admin`); }
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setUser(null); }, []);
  const reloadCatalog = useCallback(() => loadRemote(Boolean(user)), [loadRemote, user]);

  const updateRelease = useCallback(async (releaseId: string, update: Partial<Release>) => {
    if (!isSupabaseConfigured) { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, ...update } : release)); return {}; }
    const { error } = await supabase.from('albums').update(releaseRow(update)).eq('id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const addRelease = useCallback(async (release: ReleaseInput): Promise<CreateReleaseResult> => {
    const id = makeId();
    if (!isSupabaseConfigured) { setReleases((current) => [...current, { ...release, id } as Release]); return { id }; }
    const { error } = await supabase.from('albums').insert({ id, ...releaseRow(release) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, user]);

  const removeRelease = useCallback(async (releaseId: string) => {
    if (!isSupabaseConfigured) { setReleases((current) => current.filter((release) => release.id !== releaseId)); return {}; }
    const home = await supabase.from('home_cards').delete().eq('album_id', releaseId);
    if (home.error) return { error: home.error.message };
    const tracks = await supabase.from('tracks').delete().eq('album_id', releaseId);
    if (tracks.error) return { error: tracks.error.message };
    const links = await supabase.from('platform_links').delete().eq('album_id', releaseId);
    if (links.error) return { error: links.error.message };
    const { error } = await supabase.from('albums').delete().eq('id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const updateHomeCard = useCallback(async (slot: number, releaseId: string) => {
    if (!isSupabaseConfigured) { setHomeCardIds((current) => { const next = [...current]; next[slot] = releaseId; return next; }); return {}; }
    const { error } = await supabase.from('home_cards').upsert({ slot, album_id: releaseId || null }, { onConflict: 'slot' });
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const addTrack = useCallback(async (releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => {
    const id = makeId();
    const release = releases.find((item) => item.id === releaseId);
    const order = (release?.tracks?.length ?? 0) + 1;
    if (!isSupabaseConfigured) { setReleases((current) => current.map((item) => item.id === releaseId ? { ...item, tracks: [...(item.tracks ?? []), { ...track, id, release_id: releaseId, order }] } : item)); return { id }; }
    const { error } = await supabase.from('tracks').insert({ id, ...trackRow(releaseId, { ...track, order }) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, releases, user]);

  const removeTrack = useCallback(async (releaseId: string, trackId: string) => {
    if (!isSupabaseConfigured) { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).filter((track) => track.id !== trackId) } : release)); return {}; }
    const existing = releases.flatMap((release) => release.tracks ?? []).find((track) => track.id === trackId);
    const { error } = await supabase.from('tracks').delete().eq('id', trackId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    const audioPath = storagePathFromReference(existing?.audio_url, 'audio');
    if (audioPath) {
      const removed = await supabase.storage.from('audio').remove([audioPath]);
      if (removed.error) return { error: removed.error.message };
    }
    const remaining = await supabase.from('tracks').select('id').eq('album_id', releaseId).order('track_order');
    if (remaining.error) return { error: remaining.error.message };
    for (const [index, track] of (remaining.data ?? []).entries()) {
      const normalized = await supabase.from('tracks').update({ track_order: index + 1 }).eq('id', track.id).eq('album_id', releaseId);
      if (normalized.error) return { error: normalized.error.message };
    }
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const updateTrack = useCallback(async (releaseId: string, trackId: string, update: Partial<Track>) => {
    if (!isSupabaseConfigured) { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, ...update } : track) } : release)); return {}; }
    const { error } = await supabase.from('tracks').update(trackRow(releaseId, update)).eq('id', trackId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const saveTrackOrder = useCallback(async (releaseId: string, trackIds: string[]) => {
    if (!isSupabaseConfigured) return {};
    for (const [index, trackId] of trackIds.entries()) {
      const { error } = await supabase.from('tracks').update({ track_order: index + 1 }).eq('id', trackId).eq('album_id', releaseId);
      if (error) return { error: error.message };
    }
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const saveArtwork = useCallback(async (releaseId: string, file: File) => {
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${releaseId}/${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('covers').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const { data } = supabase.storage.from('covers').getPublicUrl(path);
    const update = await supabase.from('albums').update({ cover_url: data.publicUrl }).eq('id', releaseId);
    if (update.error) { await supabase.storage.from('covers').remove([path]); return { error: update.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const removeArtwork = useCallback(async (releaseId: string) => {
    const release = releases.find((item) => item.id === releaseId);
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const update = await supabase.from('albums').update({ cover_url: null }).eq('id', releaseId);
    if (update.error) return { error: update.error.message };
    const path = storagePathFromReference(release?.artwork_url, 'covers');
    if (path) { const removed = await supabase.storage.from('covers').remove([path]); if (removed.error) return { error: removed.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const saveTrackAudio = useCallback(async (releaseId: string, trackId: string, file: File) => {
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'audio';
    const path = `${releaseId}/${trackId}-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('audio').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const update = await supabase.from('tracks').update({ audio_url: path }).eq('id', trackId).eq('album_id', releaseId);
    if (update.error) { await supabase.storage.from('audio').remove([path]); return { error: update.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const removeTrackAudio = useCallback(async (releaseId: string, trackId: string) => {
    const track = releases.flatMap((release) => release.tracks ?? []).find((item) => item.id === trackId);
    const update = await supabase.from('tracks').update({ audio_url: null }).eq('id', trackId).eq('album_id', releaseId);
    if (update.error) return { error: update.error.message };
    const path = storagePathFromReference(track?.audio_reference ?? track?.audio_url, 'audio');
    if (path) { const removed = await supabase.storage.from('audio').remove([path]); if (removed.error) return { error: removed.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);


  const saveVisualMedia = useCallback(async (releaseId: string, file: File) => {
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `visuals/${releaseId}/${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('artist-assets').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const { data } = supabase.storage.from('artist-assets').getPublicUrl(path);
    const update = await supabase.from('albums').update({ visual_url: data.publicUrl }).eq('id', releaseId);
    if (update.error) { await supabase.storage.from('artist-assets').remove([path]); return { error: update.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const removeVisualMedia = useCallback(async (releaseId: string) => {
    const release = releases.find((item) => item.id === releaseId);
    const update = await supabase.from('albums').update({ visual_url: null }).eq('id', releaseId);
    if (update.error) return { error: update.error.message };
    const path = storagePathFromReference(release?.visual_url, 'artist-assets');
    if (path) { const removed = await supabase.storage.from('artist-assets').remove([path]); if (removed.error) return { error: removed.error.message }; }
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const addPlatformLink = useCallback(async (releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => {
    const id = makeId();
    const release = releases.find((item) => item.id === releaseId);
    const order = (release?.platform_links?.length ?? 0) + 1;
    const { error } = await supabase.from('platform_links').insert({ id, ...linkRow(releaseId, { ...link, order }) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, releases, user]);

  const updatePlatformLink = useCallback(async (releaseId: string, linkId: string, update: Partial<PlatformLink>) => {
    const { error } = await supabase.from('platform_links').update(linkRow(releaseId, update)).eq('id', linkId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const removePlatformLink = useCallback(async (releaseId: string, linkId: string) => {
    const { error } = await supabase.from('platform_links').delete().eq('id', linkId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const recordPlay = useCallback((releaseId: string, trackId: string) => {
    if (isSupabaseConfigured) void supabase.rpc('increment_track_play', { p_track_id: trackId });
    else setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, play_count: (track.play_count ?? 0) + 1 } : track) } : release));
  }, []);
  const resetCatalog = useCallback(() => setReleases(fallbackReleases), []);

  const value = useMemo(() => ({ artist, releases, upcomingReleases: releases.filter((release) => !release.published), homeCardIds, user, isRecoveringPassword, isReady, isRemote: isSupabaseConfigured, signIn, signUp, resetPassword, updatePassword, signOut, reloadCatalog, updateRelease, addRelease, removeRelease, updateHomeCard, addTrack, removeTrack, updateTrack, saveTrackOrder, saveArtwork, removeArtwork, saveTrackAudio, removeTrackAudio, saveVisualMedia, removeVisualMedia, addPlatformLink, updatePlatformLink, removePlatformLink, recordPlay, resetCatalog }), [artist, releases, homeCardIds, user, isRecoveringPassword, isReady, signIn, signUp, resetPassword, updatePassword, signOut, reloadCatalog, updateRelease, addRelease, removeRelease, updateHomeCard, addTrack, removeTrack, updateTrack, saveTrackOrder, saveArtwork, removeArtwork, saveTrackAudio, removeTrackAudio, saveVisualMedia, removeVisualMedia, addPlatformLink, updatePlatformLink, removePlatformLink, recordPlay, resetCatalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockArtist, mockReleases } from '../../data/mock';
import { siteConfig } from '../../config/site';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Artist, PlatformLink, Release, Track } from '../../types';
import { isPublished } from '../../lib/releaseStatus';
import { normalizeRelease } from './normalizeRelease';

type ReleaseInput = Omit<Release, 'id' | 'created_at' | 'updated_at'>;
type MutationResult = { error?: string; warning?: string };
type CreateReleaseResult = MutationResult & { id?: string };

interface CatalogContextValue {
  artist: Artist;
  releases: Release[];
  upcomingReleases: Release[];
  homeCardIds: string[];
  homeHeroId: string | null;
  homeHeroError: string | null;
  user: { id: string; email?: string } | null;
  isRecoveringPassword: boolean;
  catalogError: string | null;
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
  updateHomeHero: (releaseId: string) => Promise<MutationResult>;
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
  resetCatalog: () => Promise<MutationResult>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);
const localMockMode = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';
const fallbackReleases = mockReleases as Release[];
const neutralArtist: Artist = { id: 'the12thhouse', name: siteConfig.introName, slug: 'the12thhouse', biography: '', image_url: null, location: null, email: null, website: null };
const approvedAdminEmail = 'kamielkhajehpour@gmail.com';
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0')}`;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown backend error');
}

function releaseRow(release: Partial<Release>) {
  const row: Record<string, unknown> = {};
  const fields: Array<[keyof Release, string]> = [
    ['title', 'title'], ['slug', 'slug'], ['release_date', 'release_date'], ['description', 'description'],
    ['featured', 'featured'], ['published', 'published'], ['status', 'status'], ['show_release_date', 'show_release_date'], ['visual_url', 'visual_url'],
  ];
  fields.forEach(([from, to]) => { if (from in release) row[to] = release[from]; });
  if ('type' in release && release.type && release.contentType !== 'visual') row.release_type = release.type;
  if ('artwork_url' in release) row.cover_url = release.artwork_url;
  if ('contentType' in release) row.content_type = release.contentType;
  if ('visualType' in release && release.visualType) row.visual_type = release.visualType;
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
async function cleanupStorageObject(bucket: string, reference: string | null | undefined) {
  const path = storagePathFromReference(reference, bucket);
  if (!path || !isSupabaseConfigured) return null;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return error ? `${bucket}/${path}` : null;
}
function cleanupWarning(paths: string[]) {
  return paths.length > 0 ? `Saved, but old media cleanup needs attention (${paths.join(', ')}).` : undefined;
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [artist] = useState<Artist>(localMockMode ? mockArtist as Artist : neutralArtist);
  const [releases, setReleases] = useState<Release[]>(localMockMode ? fallbackReleases : []);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [homeCardIds, setHomeCardIds] = useState<string[]>([]);
  const [homeHeroId, setHomeHeroId] = useState<string | null>(null);
  const [homeHeroError, setHomeHeroError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hashParams.get('type') === 'recovery' || new URLSearchParams(window.location.search).get('type') === 'recovery';
  });
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  const resolveAudioReferences = useCallback(async (items: Release[], authenticated: boolean) => {
    if (!isSupabaseConfigured) return items;
    const resolved = await Promise.all(items.map(async (release) => {
      const tracks = await Promise.all((release.tracks ?? []).map(async (track) => {
        if (!authenticated && (!isPublished(release) || track.published !== true)) return { ...track, audio_url: null, audio_reference: null, audio_error: null };
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
      let albumsQuery = supabase.from('albums').select('*, tracks(*), platform_links(*)').order('release_date', { ascending: false, nullsFirst: false });
      if (!authenticated) albumsQuery = albumsQuery.in('status', ['published', 'upcoming']);
      const { data, error } = await albumsQuery;
      if (error) { setReleases([]); setHomeCardIds([]); setHomeHeroId(null); setHomeHeroError(null); setCatalogError(error.message); setIsReady(true); return { error: error.message }; }
      const normalized = await resolveAudioReferences((data ?? []).map(normalizeRelease), authenticated);
      setReleases(normalized);
      setCatalogError(null);
      const [cards, hero] = await Promise.all([
        supabase.from('home_cards').select('slot, album_id').order('slot'),
        supabase.from('home_hero').select('release_id').eq('id', 1).maybeSingle(),
      ]);
      if (cards.error) { setReleases([]); setHomeCardIds([]); setHomeHeroId(null); setHomeHeroError(null); setCatalogError(cards.error.message); setIsReady(true); return { error: cards.error.message }; }
      const slots = Array.from({ length: 3 }, () => '');
      (cards.data ?? []).forEach((card) => { if (card.slot >= 0 && card.slot < slots.length && normalized.some((release) => release.id === card.album_id)) slots[card.slot] = card.album_id ?? ''; });
      setHomeCardIds(slots);
      const heroId = hero.data?.release_id ?? null;
      setHomeHeroError(hero.error?.message ?? null);
      setHomeHeroId(!hero.error && heroId && normalized.some((release) => release.id === heroId && isPublished(release) && Boolean(release.artwork_url)) ? heroId : null);
      if (authenticated) {
        const current = await supabase.auth.getUser();
        if (current.error) { setIsReady(true); return { error: current.error.message }; }
        if (current.data.user) setUser({ id: current.data.user.id, email: current.data.user.email });
      }
      setIsReady(true);
      return {};
    } catch (error) {
      const message = errorMessage(error);
      setReleases([]); setHomeCardIds([]); setHomeHeroId(null); setHomeHeroError(null); setCatalogError(message); setIsReady(true);
      return { error: message };
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
    if (release.contentType === 'visual' && (release.type || (release.tracks?.length ?? 0) > 0 || (release.platform_links?.length ?? 0) > 0)) {
      return { error: 'Visual releases cannot contain music type, track, or platform-link data.' };
    }
    const id = makeId();
    if (!isSupabaseConfigured) { setReleases((current) => [...current, { ...release, id } as Release]); return { id }; }
    const { error } = await supabase.from('albums').insert({ id, ...releaseRow(release) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, user]);

  const removeRelease = useCallback(async (releaseId: string) => {
    const release = releases.find((item) => item.id === releaseId);
    const media = [
      { bucket: 'covers', reference: release?.artwork_url },
      { bucket: 'artist-assets', reference: release?.visual_url },
      ...((release?.tracks ?? []).map((track) => ({ bucket: 'audio', reference: track.audio_reference ?? track.audio_url }))),
    ];
    if (!isSupabaseConfigured) { setReleases((current) => current.filter((item) => item.id !== releaseId)); return {}; }
    const home = await supabase.from('home_cards').delete().eq('album_id', releaseId);
    if (home.error) return { error: home.error.message };
    const tracks = await supabase.from('tracks').delete().eq('album_id', releaseId);
    if (tracks.error) return { error: tracks.error.message };
    const links = await supabase.from('platform_links').delete().eq('album_id', releaseId);
    if (links.error) return { error: links.error.message };
    const { error } = await supabase.from('albums').delete().eq('id', releaseId);
    if (error) return { error: error.message };
    const cleanupFailures: string[] = [];
    for (const item of media) { const failed = await cleanupStorageObject(item.bucket, item.reference); if (failed) cleanupFailures.push(failed); }
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailures) };
  }, [loadRemote, releases, user]);

  const updateHomeCard = useCallback(async (slot: number, releaseId: string) => {
    if (!isSupabaseConfigured) { setHomeCardIds((current) => { const next = [...current]; next[slot] = releaseId; return next; }); return {}; }
    const { error } = await supabase.from('home_cards').upsert({ slot, album_id: releaseId || null }, { onConflict: 'slot' });
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, user]);

  const updateHomeHero = useCallback(async (releaseId: string) => {
    if (releaseId && !releases.some((release) => release.id === releaseId && isPublished(release) && Boolean(release.artwork_url))) {
      return { error: 'Choose an existing published release with artwork.' };
    }
    if (!isSupabaseConfigured) { setHomeHeroError(null); setHomeHeroId(releaseId || null); return {}; }
    const { error } = await supabase.from('home_hero').upsert({ id: 1, release_id: releaseId || null }, { onConflict: 'id' });
    if (error) { setHomeHeroError(error.message); return { error: error.message }; }
    setHomeHeroError(null);
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const addTrack = useCallback(async (releaseId: string, track: Omit<Track, 'id' | 'release_id' | 'order'>) => {
    const release = releases.find((item) => item.id === releaseId);
    if (!release || release.contentType !== 'music') return { error: 'Tracks can only be added to music releases.' };
    const id = makeId();
    const order = (release?.tracks?.length ?? 0) + 1;
    if (!isSupabaseConfigured) { setReleases((current) => current.map((item) => item.id === releaseId ? { ...item, tracks: [...(item.tracks ?? []), { ...track, id, release_id: releaseId, order }] } : item)); return { id }; }
    const { error } = await supabase.from('tracks').insert({ id, ...trackRow(releaseId, { ...track, order }) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, releases, user]);

  const removeTrack = useCallback(async (releaseId: string, trackId: string) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Tracks can only be removed from music releases.' };
    if (!isSupabaseConfigured) { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).filter((track) => track.id !== trackId) } : release)); return {}; }
    const existing = releases.flatMap((release) => release.tracks ?? []).find((track) => track.id === trackId);
    const { error } = await supabase.from('tracks').delete().eq('id', trackId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    const cleanupFailure = await cleanupStorageObject('audio', existing?.audio_reference ?? existing?.audio_url);
    const remaining = await supabase.from('tracks').select('id').eq('album_id', releaseId).order('track_order');
    if (remaining.error) return { error: remaining.error.message };
    for (const [index, track] of (remaining.data ?? []).entries()) {
      const normalized = await supabase.from('tracks').update({ track_order: index + 1 }).eq('id', track.id).eq('album_id', releaseId);
      if (normalized.error) return { error: normalized.error.message };
    }
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const updateTrack = useCallback(async (releaseId: string, trackId: string, update: Partial<Track>) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Tracks can only be updated on music releases.' };
    if (!isSupabaseConfigured) { setReleases((current) => current.map((release) => release.id === releaseId ? { ...release, tracks: (release.tracks ?? []).map((track) => track.id === trackId ? { ...track, ...update } : track) } : release)); return {}; }
    const { error } = await supabase.from('tracks').update(trackRow(releaseId, update)).eq('id', trackId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const saveTrackOrder = useCallback(async (releaseId: string, trackIds: string[]) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Track order only applies to music releases.' };
    if (!isSupabaseConfigured) return {};
    for (const [index, trackId] of trackIds.entries()) {
      const { error } = await supabase.from('tracks').update({ track_order: -(index + 1) }).eq('id', trackId).eq('album_id', releaseId);
      if (error) return { error: error.message };
    }
    for (const [index, trackId] of trackIds.entries()) {
      const { error } = await supabase.from('tracks').update({ track_order: index + 1 }).eq('id', trackId).eq('album_id', releaseId);
      if (error) return { error: error.message };
    }
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const saveArtwork = useCallback(async (releaseId: string, file: File) => {
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const release = releases.find((item) => item.id === releaseId);
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${releaseId}/${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('covers').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const { data } = supabase.storage.from('covers').getPublicUrl(path);
    const update = await supabase.from('albums').update({ cover_url: data.publicUrl }).eq('id', releaseId);
    if (update.error) { await supabase.storage.from('covers').remove([path]); return { error: update.error.message }; }
    const cleanupFailure = await cleanupStorageObject('covers', release?.artwork_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const removeArtwork = useCallback(async (releaseId: string) => {
    const release = releases.find((item) => item.id === releaseId);
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const update = await supabase.from('albums').update({ cover_url: null }).eq('id', releaseId);
    if (update.error) return { error: update.error.message };
    const cleanupFailure = await cleanupStorageObject('covers', release?.artwork_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const saveTrackAudio = useCallback(async (releaseId: string, trackId: string, file: File) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Audio files can only be saved for music releases.' };
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'audio';
    const path = `${releaseId}/${trackId}-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('audio').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const update = await supabase.from('tracks').update({ audio_url: path }).eq('id', trackId).eq('album_id', releaseId);
    if (update.error) { await supabase.storage.from('audio').remove([path]); return { error: update.error.message }; }
    const oldTrack = releases.flatMap((release) => release.tracks ?? []).find((track) => track.id === trackId);
    const cleanupFailure = await cleanupStorageObject('audio', oldTrack?.audio_reference ?? oldTrack?.audio_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const removeTrackAudio = useCallback(async (releaseId: string, trackId: string) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Audio files can only be removed from music releases.' };
    const track = releases.flatMap((release) => release.tracks ?? []).find((item) => item.id === trackId);
    const update = await supabase.from('tracks').update({ audio_url: null }).eq('id', trackId).eq('album_id', releaseId);
    if (update.error) return { error: update.error.message };
    const cleanupFailure = await cleanupStorageObject('audio', track?.audio_reference ?? track?.audio_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);


  const saveVisualMedia = useCallback(async (releaseId: string, file: File) => {
    const release = releases.find((item) => item.id === releaseId);
    if (release?.contentType !== 'visual' || release.visualType !== 'animation') return { error: 'Animation media can only be saved for Visual Animation releases.' };
    if (!isSupabaseConfigured) return { error: 'Supabase Storage is not configured.' };
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `visuals/${releaseId}/${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('artist-assets').upload(path, file, { upsert: false, contentType: file.type || undefined, cacheControl: '3600' });
    if (upload.error) return { error: upload.error.message };
    const { data } = supabase.storage.from('artist-assets').getPublicUrl(path);
    const update = await supabase.from('albums').update({ visual_url: data.publicUrl }).eq('id', releaseId);
    if (update.error) { await supabase.storage.from('artist-assets').remove([path]); return { error: update.error.message }; }
    const cleanupFailure = await cleanupStorageObject('artist-assets', releases.find((item) => item.id === releaseId)?.visual_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const removeVisualMedia = useCallback(async (releaseId: string) => {
    const release = releases.find((item) => item.id === releaseId);
    if (release?.contentType !== 'visual' || release.visualType !== 'animation') return { error: 'Animation media can only be removed from Visual Animation releases.' };
    const update = await supabase.from('albums').update({ visual_url: null }).eq('id', releaseId);
    if (update.error) return { error: update.error.message };
    const cleanupFailure = await cleanupStorageObject('artist-assets', release?.visual_url);
    const reloaded = await loadRemote(Boolean(user));
    return reloaded.error ? reloaded : { warning: cleanupWarning(cleanupFailure ? [cleanupFailure] : []) };
  }, [loadRemote, releases, user]);

  const addPlatformLink = useCallback(async (releaseId: string, link: Omit<PlatformLink, 'id' | 'order'>) => {
    const release = releases.find((item) => item.id === releaseId);
    if (!release || release.contentType !== 'music') return { error: 'Platform links are only available for music releases.' };
    const id = makeId();
    const order = (release?.platform_links?.length ?? 0) + 1;
    const { error } = await supabase.from('platform_links').insert({ id, ...linkRow(releaseId, { ...link, order }) });
    if (error) return { error: error.message };
    const reloadError = await loadRemote(Boolean(user));
    return reloadError.error ? reloadError : { id };
  }, [loadRemote, releases, user]);

  const updatePlatformLink = useCallback(async (releaseId: string, linkId: string, update: Partial<PlatformLink>) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Platform links are only available for music releases.' };
    const { error } = await supabase.from('platform_links').update(linkRow(releaseId, update)).eq('id', linkId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const removePlatformLink = useCallback(async (releaseId: string, linkId: string) => {
    if (releases.find((release) => release.id === releaseId)?.contentType !== 'music') return { error: 'Platform links are only available for music releases.' };
    const { error } = await supabase.from('platform_links').delete().eq('id', linkId).eq('album_id', releaseId);
    if (error) return { error: error.message };
    return loadRemote(Boolean(user));
  }, [loadRemote, releases, user]);

  const resetCatalog = useCallback(() => localMockMode ? (setReleases(fallbackReleases), Promise.resolve({})) : loadRemote(Boolean(user)), [loadRemote, user]);

  const value = useMemo(() => ({ artist, releases, upcomingReleases: releases.filter((release) => !release.published), homeCardIds, homeHeroId, homeHeroError, user, isRecoveringPassword, catalogError, isReady, isRemote: isSupabaseConfigured, signIn, signUp, resetPassword, updatePassword, signOut, reloadCatalog, updateRelease, addRelease, removeRelease, updateHomeCard, updateHomeHero, addTrack, removeTrack, updateTrack, saveTrackOrder, saveArtwork, removeArtwork, saveTrackAudio, removeTrackAudio, saveVisualMedia, removeVisualMedia, addPlatformLink, updatePlatformLink, removePlatformLink, resetCatalog }), [artist, releases, homeCardIds, homeHeroId, homeHeroError, user, isRecoveringPassword, catalogError, isReady, signIn, signUp, resetPassword, updatePassword, signOut, reloadCatalog, updateRelease, addRelease, removeRelease, updateHomeCard, updateHomeHero, addTrack, removeTrack, updateTrack, saveTrackOrder, saveArtwork, removeArtwork, saveTrackAudio, removeTrackAudio, saveVisualMedia, removeVisualMedia, addPlatformLink, updatePlatformLink, removePlatformLink, resetCatalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
}

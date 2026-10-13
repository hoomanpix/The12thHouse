import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogProvider, useCatalog } from './CatalogProvider';

const database = vi.hoisted(() => ({
  heroReleaseId: null as string | null,
  upserts: [] as Array<Record<string, unknown>>,
  publicTrackMetadata: [] as Array<Record<string, unknown>>,
  authenticated: false,
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  authenticatedAlbumsGate: null as Promise<unknown> | null,
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: database.from,
    auth: {
      getSession: database.getSession,
      onAuthStateChange: database.onAuthStateChange,
      getUser: database.getUser,
      signOut: database.signOut,
    },
    storage: { from: () => ({ createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed.example/${path}` }, error: null })) }) },
    channel: database.channel,
    removeChannel: database.removeChannel,
    rpc: database.rpc,
  },
}));

const publishedRelease = {
  id: '33333333-3333-4333-8333-333333333333', artist_id: 'artist-1', title: 'Existing artwork',
  slug: 'existing-artwork', content_type: 'music', release_type: 'single', release_date: '2025-04-04',
  status: 'published', published: true, show_release_date: true, description: '', featured: false,
  cover_url: 'https://cdn.example/existing-artwork.jpg', tracks: [], platform_links: [],
};
const privateRelease = {
  id: 'private-release', artist_id: 'artist-1', title: 'Private Draft', slug: 'private-draft',
  content_type: 'music', release_type: 'album', release_date: null, status: 'draft', published: false,
  show_release_date: true, description: 'private', featured: false,
  cover_url: 'https://cdn.example/private.jpg', tracks: [{ id: 'private-track', album_id: 'private-release', title: 'Private metadata', track_order: 1, audio_url: 'private/private.mp3', published: false }], platform_links: [],
};
let currentCatalog: ReturnType<typeof useCatalog> | null = null;
let authCallback: ((event: string, session: { user?: { id: string; email?: string } } | null) => void) | null = null;
function CaptureCatalog() { currentCatalog = useCatalog(); return null; }

function queryResult(table: string) {
  if (table === 'albums' && database.authenticated && database.authenticatedAlbumsGate) return database.authenticatedAlbumsGate;
  if (table === 'albums') return { data: [database.authenticated ? privateRelease : publishedRelease], error: null };
  if (table === 'public_track_metadata') return { data: database.publicTrackMetadata, error: null };
  if (table === 'home_cards') return { data: [], error: null };
  return { data: [], error: null };
}

function makeQuery(table: string) {
  const query: Record<string, any> = {};
  for (const method of ['select', 'order', 'in', 'eq']) query[method] = vi.fn(() => query);
  query.upsert = vi.fn(async (value: Record<string, unknown>) => {
    database.upserts.push(value);
    database.heroReleaseId = value.release_id as string | null;
    return { error: null };
  });
  query.maybeSingle = vi.fn(async () => ({
    data: database.heroReleaseId ? { release_id: database.heroReleaseId } : null,
    error: null,
  }));
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(queryResult(table)).then(resolve, reject);
  return query;
}

describe('CatalogProvider Home Hero persistence', () => {
  let container: HTMLDivElement;
  let root: Root;
  let unsubscribe: ReturnType<typeof vi.fn>;

  function mountProvider() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentCatalog = null;
    act(() => root.render(<CatalogProvider><CaptureCatalog /></CatalogProvider>));
  }

  async function settleCatalog() {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    database.heroReleaseId = null;
    database.upserts = [];
    database.publicTrackMetadata = [];
    database.authenticated = false;
    database.authenticatedAlbumsGate = null;
    database.from.mockImplementation((table: string) => makeQuery(table));
    database.getSession.mockResolvedValue({ data: { session: null }, error: null });
    database.getUser.mockResolvedValue({ data: { user: null }, error: null });
    unsubscribe = vi.fn();
    authCallback = null;
    database.onAuthStateChange.mockImplementation((callback: typeof authCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    database.signOut.mockClear();
    database.signOut.mockImplementation(async () => {
      authCallback?.('SIGNED_OUT', null);
      return { error: null };
    });
    database.rpc.mockReset().mockResolvedValue({ data: 1, error: null });
    database.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    });
    database.removeChannel.mockResolvedValue({ status: 'ok' });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('saves the dedicated selection and restores it from Supabase after a provider reload', async () => {
    mountProvider();
    await settleCatalog();
    expect(currentCatalog?.isReady).toBe(true);
    expect(currentCatalog?.homeHeroId).toBeNull();

    let saveResult: { error?: string } | undefined;
    await act(async () => { saveResult = await currentCatalog!.updateHomeHero(publishedRelease.id); });
    expect(saveResult).toEqual({});
    expect(database.upserts).toEqual([{ id: 1, release_id: publishedRelease.id }]);
    expect(currentCatalog?.homeHeroId).toBe(publishedRelease.id);

    act(() => root.unmount());
    container.remove();
    mountProvider();
    await settleCatalog();
    expect(currentCatalog?.homeHeroId).toBe(publishedRelease.id);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects an image selection that is not an existing published artwork', async () => {
    mountProvider();
    await settleCatalog();
    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.updateHomeHero('not-a-published-release'); });
    expect(result?.error).toContain('published release with artwork');
    expect(database.upserts).toHaveLength(0);
  });

  it('revalidates the catalog when a hidden page becomes visible again', async () => {
    mountProvider();
    await settleCatalog();
    const initialQueryCount = database.from.mock.calls.length;

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(database.from.mock.calls.length).toBeGreaterThan(initialQueryCount);
    expect(currentCatalog?.isReady).toBe(true);
  });

  it('merges public track metadata while keeping unpublished audio unavailable', async () => {
    database.publicTrackMetadata = [{
      id: 'hidden-track', album_id: publishedRelease.id, title: 'Hidden track title', track_order: 1, published: false,
    }];
    mountProvider();
    await settleCatalog();

    expect(currentCatalog?.releases[0].tracks).toEqual([expect.objectContaining({
      id: 'hidden-track', title: 'Hidden track title', published: false, audio_url: null,
    })]);
  });

  it('uses one atomic reorder RPC and never performs client-side row updates', async () => {
    mountProvider();
    await settleCatalog();

    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.saveTrackOrder(publishedRelease.id, ['track-1', 'track-2']); });

    expect(result).toEqual({});
    expect(database.rpc).toHaveBeenCalledTimes(1);
    expect(database.rpc).toHaveBeenCalledWith('reorder_album_tracks', {
      p_album_id: publishedRelease.id,
      p_track_ids: ['track-1', 'track-2'],
    });
    expect(database.from.mock.calls.filter(([table]) => table === 'tracks')).toHaveLength(0);
  });

  it('returns RPC errors without attempting a fallback reorder', async () => {
    database.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Track IDs must be unique.' } });
    mountProvider();
    await settleCatalog();

    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.saveTrackOrder(publishedRelease.id, ['track-1', 'track-1']); });

    expect(result).toEqual({ error: 'Track IDs must be unique.' });
    expect(database.rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects a release that is not present as a music release before calling the RPC', async () => {
    mountProvider();
    await settleCatalog();

    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.saveTrackOrder('missing-release', []); });

    expect(result).toEqual({ error: 'Track order only applies to music releases.' });
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('clears private catalog state and reloads the public catalog after sign-out', async () => {
    database.authenticated = true;
    database.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin', email: 'kamielkhajehpour@gmail.com' } } }, error: null });
    mountProvider();
    await settleCatalog();
    expect(currentCatalog?.releases[0].title).toBe('Private Draft');

    database.authenticated = false;
    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.signOut(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(result).toEqual({});
    expect(currentCatalog?.user).toBeNull();
    expect(currentCatalog?.releases.map((release) => release.title)).toEqual(['Existing artwork']);
    expect(currentCatalog?.releases.some((release) => release.title === 'Private Draft')).toBe(false);
    expect(currentCatalog?.releases.flatMap((release) => release.tracks ?? []).some((track) => track.audio_url || track.audio_reference)).toBe(false);
  });

  it('coalesces getSession and INITIAL_SESSION into one anonymous bootstrap load, then reloads on a later auth change', async () => {
    vi.useFakeTimers();
    mountProvider();
    const initialCalls = database.from.mock.calls.length;

    await act(async () => {
      authCallback?.('INITIAL_SESSION', null);
      await Promise.resolve();
      expect(database.from.mock.calls.length).toBe(initialCalls);
      vi.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(database.from.mock.calls.length - initialCalls).toBe(4);

    database.authenticated = true;
    await act(async () => {
      authCallback?.('SIGNED_IN', { user: { id: 'admin', email: 'kamielkhajehpour@gmail.com' } });
      vi.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(database.from.mock.calls.length - initialCalls).toBeGreaterThan(4);
  });

  it('does not let a stale authenticated response restore private state after sign-out', async () => {
    database.authenticated = true;
    database.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin', email: 'kamielkhajehpour@gmail.com' } } }, error: null });
    let resolvePrivate: ((value: unknown) => void) | undefined;
    database.authenticatedAlbumsGate = new Promise((resolve) => { resolvePrivate = resolve; });
    mountProvider();
    await act(async () => { await Promise.resolve(); });

    database.authenticated = false;
    await act(async () => { authCallback?.('SIGNED_OUT', null); await new Promise((resolve) => setTimeout(resolve, 0)); });
    resolvePrivate?.({ data: [privateRelease], error: null });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(currentCatalog?.releases.some((release) => release.title === 'Private Draft')).toBe(false);
    expect(currentCatalog?.releases.map((release) => release.title)).toEqual(['Existing artwork']);
  });

  it('handles repeated signed-out auth events without calling auth again or creating a loop', async () => {
    mountProvider();
    await settleCatalog();
    const before = database.from.mock.calls.length;

    await act(async () => {
      authCallback?.('SIGNED_OUT', null);
      authCallback?.('SIGNED_OUT', null);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(database.signOut).not.toHaveBeenCalled();
    expect(database.from.mock.calls.length).toBeGreaterThan(before);
    expect(database.from.mock.calls.length).toBeLessThanOrEqual(before + 8);
    expect(currentCatalog?.releases.map((release) => release.title)).toEqual(['Existing artwork']);
  });

  it('does not reload after an anonymous reload has been scheduled and the provider unmounts', async () => {
    vi.useFakeTimers();
    mountProvider();
    await act(async () => { await Promise.resolve(); });
    const before = database.from.mock.calls.length;

    act(() => { authCallback?.('SIGNED_OUT', null); });
    act(() => root.unmount());
    container.remove();
    vi.runAllTimers();

    expect(database.from.mock.calls.length).toBe(before);
  });

  it('returns sign-out errors and restores authenticated state instead of claiming clean logout', async () => {
    database.authenticated = true;
    database.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin', email: 'kamielkhajehpour@gmail.com' } } }, error: null });
    database.signOut.mockResolvedValueOnce({ error: { message: 'Network unavailable.' } });
    mountProvider();
    await settleCatalog();

    let result: { error?: string } | undefined;
    await act(async () => { result = await currentCatalog!.signOut(); });

    expect(result).toEqual({ error: 'Network unavailable.' });
    expect(currentCatalog?.releases[0].title).toBe('Private Draft');
  });
});

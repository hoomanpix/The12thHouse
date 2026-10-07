import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogProvider, useCatalog } from './CatalogProvider';

const database = vi.hoisted(() => ({
  heroReleaseId: null as string | null,
  upserts: [] as Array<Record<string, unknown>>,
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
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
    storage: { from: () => ({ createSignedUrl: vi.fn() }) },
    rpc: vi.fn(),
  },
}));

const publishedRelease = {
  id: '33333333-3333-4333-8333-333333333333', artist_id: 'artist-1', title: 'Existing artwork',
  slug: 'existing-artwork', content_type: 'music', release_type: 'single', release_date: '2025-04-04',
  status: 'published', published: true, show_release_date: true, description: '', featured: false,
  cover_url: 'https://cdn.example/existing-artwork.jpg', tracks: [], platform_links: [],
};
let currentCatalog: ReturnType<typeof useCatalog> | null = null;
function CaptureCatalog() { currentCatalog = useCatalog(); return null; }

function queryResult(table: string) {
  if (table === 'albums') return { data: [publishedRelease], error: null };
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
    database.from.mockImplementation((table: string) => makeQuery(table));
    database.getSession.mockResolvedValue({ data: { session: null }, error: null });
    database.getUser.mockResolvedValue({ data: { user: null }, error: null });
    unsubscribe = vi.fn();
    database.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
    database.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
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
});

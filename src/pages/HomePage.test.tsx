import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const mocks = vi.hoisted(() => ({ catalog: {} as Record<string, unknown>, setQueue: vi.fn(), playTrack: vi.fn() }));
vi.mock('../features/catalog/CatalogProvider', () => ({ useCatalog: () => mocks.catalog }));
vi.mock('../features/audio-player/AudioPlayerProvider', () => ({ useAudioPlayer: () => ({ setQueue: mocks.setQueue, playTrack: mocks.playTrack }) }));

const featuredMusic = {
  id: 'featured-music', artist_id: 'artist-1', title: 'Featured music', slug: 'featured-music', type: 'single',
  contentType: 'music', release_date: null, status: 'published', show_release_date: true, description: '',
  artwork_url: 'https://cdn.example/featured.jpg', featured: true, published: true, tracks: [], platform_links: [],
};
const selectedHero = {
  id: 'hero-visual', artist_id: 'artist-1', title: 'Independent Hero', slug: 'independent-hero',
  contentType: 'visual', visualType: 'cover', release_date: null, status: 'published', show_release_date: true,
  description: '', artwork_url: 'https://cdn.example/hero.jpg', featured: false, published: true,
};

describe('HomePage Hero selection', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.catalog = {
      artist: { id: 'artist-1', name: 'The Artist' }, releases: [featuredMusic, selectedHero],
      homeHeroId: selectedHero.id, homeCardIds: [], recordPlay: vi.fn(), isReady: true, catalogError: null,
    };
    mocks.setQueue.mockClear();
    mocks.playTrack.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders the persisted Hero artwork independently while Featured content keeps its CTA behavior', () => {
    act(() => root.render(<MemoryRouter><HomePage /></MemoryRouter>));
    expect(container.querySelector('.hero-visual img')?.getAttribute('src')).toBe('https://cdn.example/hero.jpg');
    expect(container.querySelector('.hero-block--has-image')).toBeTruthy();
    expect(container.textContent).toContain('Play latest');
  });

  it('does not silently fall back to Featured artwork when no Hero is configured', () => {
    mocks.catalog = { ...mocks.catalog, homeHeroId: null };
    act(() => root.render(<MemoryRouter><HomePage /></MemoryRouter>));
    expect(container.querySelector('.hero-visual img')).toBeNull();
    expect(container.querySelector('.hero-block--has-image')).toBeNull();
    expect(container.querySelector('.hero-visual-placeholder')?.getAttribute('aria-label')).toBe('No Hero image selected');
    expect(container.textContent).toContain('Play latest');
  });
});

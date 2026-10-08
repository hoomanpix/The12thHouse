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
      homeHeroId: selectedHero.id, homeCardIds: [], isReady: true, catalogError: null,
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

  it('links beneath the Hero artwork to the latest published release', () => {
    const latestRelease = { ...featuredMusic, id: 'latest-release', title: 'Latest', slug: 'latest-release', release_date: '2025-04-04', featured: false };
    const olderRelease = { ...selectedHero, release_date: '2025-03-04' };
    const upcomingRelease = { ...selectedHero, id: 'upcoming-release', title: 'Upcoming', slug: 'upcoming-release', release_date: '2030-01-01', status: 'upcoming', published: false };
    mocks.catalog = { ...mocks.catalog, releases: [upcomingRelease, olderRelease, latestRelease, featuredMusic] };
    act(() => root.render(<MemoryRouter><HomePage /></MemoryRouter>));
    const group = container.querySelector('.hero-visual-group');
    const link = group?.querySelector('.home-latest-release-link');
    expect(link?.querySelector('.home-latest-release-link__text')?.textContent).toBe('Listen to the Latest Release');
    expect(link?.querySelector('.home-latest-release-link__arrow')?.getAttribute('aria-hidden')).toBe('true');
    expect(link?.getAttribute('href')).toBe('/releases/latest-release');
    expect(group?.lastElementChild).toBe(link);
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

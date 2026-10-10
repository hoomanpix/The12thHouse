import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleasesPage } from './ReleasesPage';

const mocks = vi.hoisted(() => ({ catalog: {} as Record<string, unknown> }));
vi.mock('../features/catalog/CatalogProvider', () => ({ useCatalog: () => mocks.catalog }));

const visualVideoRelease = {
  id: 'visual-reel', artist_id: 'artist-1', title: 'Portrait Reel', slug: 'portrait-reel', type: 'single' as const,
  contentType: 'visual' as const, visualType: 'animation' as const, release_date: null, status: 'published' as const,
  show_release_date: true, description: '', artwork_url: 'https://cdn.example/reel-poster.jpg',
  visual_url: 'https://cdn.example/reel.mp4', featured: false, published: true,
};
const musicAlbumRelease = {
  id: 'music-album', artist_id: 'artist-1', title: 'Music Album', slug: 'music-album', type: 'album' as const,
  contentType: 'music' as const, release_date: null, status: 'published' as const, show_release_date: true,
  description: '', artwork_url: 'https://cdn.example/album.jpg', featured: false, published: true,
};
const visualCoverRelease = {
  ...visualVideoRelease, id: 'visual-cover', title: 'Visual Cover', slug: 'visual-cover', visualType: 'cover' as const,
  artwork_url: 'https://cdn.example/visual-cover.jpg', visual_url: null,
};
const animationPosterRelease = {
  ...visualVideoRelease, id: 'animation-poster', title: 'Animation Poster', slug: 'animation-poster',
  artwork_url: 'https://cdn.example/animation-poster.jpg', visual_url: null,
};

class NoopIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {}
  observe() {}
  disconnect() {}
}

describe('ReleasesPage header', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.catalog = { releases: [], isReady: true, catalogError: null };
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('omits the large Selected work title while retaining the compact page label and filters', () => {
    act(() => root.render(<MemoryRouter><ReleasesPage /></MemoryRouter>));
    expect(container.querySelector('h1')?.textContent).toBe('Releases');
    expect(container.textContent).not.toContain('Selected work');
    const categoryTabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    act(() => categoryTabs[1].click());
    expect(Array.from(container.querySelectorAll('.filter-pill')).map((button) => button.textContent)).toEqual(['All', 'Art Work', 'animation']);
    const artworkFilter = Array.from(container.querySelectorAll<HTMLButtonElement>('.filter-pill')).find((button) => button.textContent === 'Art Work');
    expect(artworkFilter?.getAttribute('aria-pressed')).toBe('false');
    act(() => artworkFilter?.click());
    expect(artworkFilter?.getAttribute('aria-pressed')).toBe('true');
    act(() => categoryTabs[0].click());
    expect(Array.from(container.querySelectorAll('.filter-pill')).map((button) => button.textContent)).toEqual(['All', 'single', 'album']);
  });

  it('renders a muted video preview in Visual and keeps the existing detail link', () => {
    mocks.catalog = { releases: [visualVideoRelease], isReady: true, catalogError: null };
    vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    act(() => root.render(<MemoryRouter><ReleasesPage /></MemoryRouter>));
    act(() => (container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]).click());

    const link = container.querySelector('.release-cover--video') as HTMLAnchorElement;
    const video = link.querySelector('video.release-video-preview') as HTMLVideoElement;
    expect(link.getAttribute('href')).toContain('/releases/portrait-reel');
    expect(video.getAttribute('src')).toBe('https://cdn.example/reel.mp4');
    expect(video.getAttribute('poster')).toBe('https://cdn.example/reel-poster.jpg');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe('none');
    expect(container.querySelector('.release-card--video')).toBeTruthy();
  });

  it('uses square music art and distinct full-art/animation-poster frames in the Visual gallery', () => {
    mocks.catalog = { releases: [musicAlbumRelease, visualCoverRelease, animationPosterRelease], isReady: true, catalogError: null };
    act(() => root.render(<MemoryRouter><ReleasesPage /></MemoryRouter>));
    expect(container.querySelector('.release-card--music .release-cover--music img')?.getAttribute('alt')).toBe('');

    act(() => (container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]).click());
    expect(container.querySelector('.release-card--visual-cover .release-cover--visual-cover img')).toBeTruthy();
    expect(container.querySelector('.release-card--visual-animation .release-cover--animation-poster img')).toBeTruthy();
  });
});

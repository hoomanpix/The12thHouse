import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleaseDetailPage } from './ReleaseDetailPage';
import type { Release } from '../types';

const mocks = vi.hoisted(() => ({ catalog: {} as Record<string, unknown>, setQueue: vi.fn(), playTrack: vi.fn() }));
vi.mock('../features/catalog/CatalogProvider', () => ({ useCatalog: () => mocks.catalog }));
vi.mock('../features/audio-player/AudioPlayerProvider', () => ({ useAudioPlayer: () => ({ setQueue: mocks.setQueue, playTrack: mocks.playTrack }) }));

const musicRelease = {
  id: 'music-release', artist_id: 'artist-1', title: 'Metadata Test', slug: 'metadata-test', type: 'album' as const,
  contentType: 'music' as const, release_date: null, status: 'published' as const, show_release_date: true,
  description: '', artwork_url: null, featured: false, published: true,
  tracks: [{ id: 'track-1', release_id: 'music-release', title: 'Track One', duration: 0, audio_url: 'https://cdn.example/track.mp3', published: true, order: 1 }],
  platform_links: [],
};
const visualRelease = {
  id: 'visual-release', artist_id: 'artist-1', title: 'Visual', slug: 'visual',
  contentType: 'visual' as const, visualType: 'cover' as const, release_date: null, status: 'published' as const,
  show_release_date: true, description: '', artwork_url: null, featured: false, published: true,
};

describe('ReleaseDetailPage media metadata', () => {
  let container: HTMLDivElement;
  let root: Root;
  let probes: HTMLAudioElement[];
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    probes = [];
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'audio') probes.push(element as HTMLAudioElement);
      return element;
    }) as typeof document.createElement);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function render(release: Release) {
    mocks.catalog = { releases: [release], isReady: true, catalogError: null };
    act(() => root.render(<MemoryRouter initialEntries={[`/releases/${release.slug}`]}><Routes><Route path="/releases/:id" element={<ReleaseDetailPage />} /></Routes></MemoryRouter>));
  }

  it('does not show a persisted placeholder duration and uses actual loaded media metadata', () => {
    render(musicRelease);
    expect(container.querySelector('.track-row')?.textContent).toContain('—:—');
    expect(container.querySelector('.track-row')?.textContent).not.toContain('0:00');
    expect(probes).toHaveLength(1);

    Object.defineProperty(probes[0], 'duration', {
      configurable: true,
      get: () => probes[0].hasAttribute('src') ? 123.8 : Number.NaN,
    });
    act(() => probes[0].dispatchEvent(new Event('loadedmetadata')));
    expect(Number.isNaN(probes[0].duration)).toBe(true);
    expect(container.querySelector('.track-row')?.textContent).toContain('2:03');
  });

  it('does not render a music tracklist for Visual content', () => {
    render(visualRelease);
    expect(container.querySelector('.tracklist-block')).toBeNull();
    expect(probes).toHaveLength(0);
  });

  it('starts the original visual video muted with native controls and the video layout', () => {
    render({ ...visualRelease, visual_url: 'https://cdn.example/portrait-reel.mp4' });
    const video = container.querySelector('video.detail-media') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute('src')).toBe('https://cdn.example/portrait-reel.mp4');
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.controls).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(container.querySelector('.detail-header--video')).toBeTruthy();
    expect(container.querySelector('.detail-cover--video')).toBeTruthy();
  });

  it('keeps native controls but does not autoplay when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render({ ...visualRelease, visual_url: 'https://cdn.example/portrait-reel.mp4' });
    const video = container.querySelector('video.detail-media') as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video.muted).toBe(true);
    expect(video.controls).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it('does not probe or show a playable duration for an unpublished track', () => {
    const release = { ...musicRelease, tracks: [{ ...musicRelease.tracks[0], published: false }] };
    render(release);
    expect(container.querySelector('.track-row')?.textContent).toContain('—:—');
    expect(container.querySelector('.track-row')?.textContent).not.toContain('0:00');
    expect(probes).toHaveLength(0);
  });

  it('bounds concurrent metadata requests and starts queued probes as earlier probes finish', () => {
    const tracks = Array.from({ length: 5 }, (_, index) => ({
      ...musicRelease.tracks[0],
      id: `track-${index + 1}`,
      audio_url: `https://cdn.example/track-${index + 1}.mp3`,
      order: index + 1,
    }));
    render({ ...musicRelease, tracks });
    expect(probes).toHaveLength(3);

    act(() => probes[0].dispatchEvent(new Event('error')));
    expect(probes).toHaveLength(4);

    act(() => probes[1].dispatchEvent(new Event('loadedmetadata')));
    expect(probes).toHaveLength(5);
  });

  it('continues the queue when metadata probes reach their timeout', () => {
    vi.useFakeTimers();
    const tracks = Array.from({ length: 5 }, (_, index) => ({
      ...musicRelease.tracks[0],
      id: `timeout-track-${index + 1}`,
      audio_url: `https://cdn.example/timeout-track-${index + 1}.mp3`,
      order: index + 1,
    }));
    render({ ...musicRelease, tracks });
    expect(probes).toHaveLength(3);

    act(() => vi.advanceTimersByTime(15_000));
    expect(probes).toHaveLength(5);
  });

  it('cancels active probes and does not start more when the release changes', () => {
    vi.useFakeTimers();
    const tracks = Array.from({ length: 5 }, (_, index) => ({
      ...musicRelease.tracks[0],
      id: `cancel-track-${index + 1}`,
      audio_url: `https://cdn.example/cancel-track-${index + 1}.mp3`,
      order: index + 1,
    }));
    render({ ...musicRelease, tracks });
    expect(probes).toHaveLength(3);

    render(visualRelease);
    act(() => vi.advanceTimersByTime(15_000));
    expect(probes).toHaveLength(3);
    expect(probes.every((probe) => !probe.hasAttribute('src'))).toBe(true);
  });
});

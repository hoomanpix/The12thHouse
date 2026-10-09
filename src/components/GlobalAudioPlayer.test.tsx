import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';

const player = vi.hoisted(() => ({
  state: {
    queue: [] as Array<{ trackId: string }>,
    activeTrackId: null as string | null,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    volumeSupportKnown: false,
    volumeSupported: true,
    isPlaying: false,
    error: null as string | null,
  },
  togglePlay: vi.fn(),
  playPrevious: vi.fn(),
  playNext: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
}));

vi.mock('../features/audio-player/AudioPlayerProvider', () => ({
  useAudioPlayer: () => player,
}));

describe('GlobalAudioPlayer expand and dismiss behavior', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    player.state = {
      queue: [],
      activeTrackId: null,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      volumeSupportKnown: false,
      volumeSupported: true,
      isPlaying: false,
      error: null,
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function renderPlayer() {
    act(() => root.render(<GlobalAudioPlayer />));
  }

  function dispatchPointerDown(target: Element) {
    act(() => target.dispatchEvent(new Event('pointerdown', { bubbles: true })));
  }

  function dispatchClick(target: Element) {
    act(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }

  it('opens from any part of the collapsed strip and omits plus/minus controls', () => {
    renderPlayer();
    const strip = container.querySelector('button.player-strip') as HTMLButtonElement | null;
    expect(strip).toBeTruthy();
    expect(strip?.getAttribute('aria-expanded')).toBe('false');
    expect(strip?.getAttribute('aria-label')).toBe('Expand player: No track selected — The12thHouse');
    expect(container.querySelector('.player-icon--plus, .player-icon--minus')).toBeNull();

    dispatchClick(container.querySelector('.player-strip__title')!);
    expect(strip?.getAttribute('aria-expanded')).toBe('true');
    expect(strip?.getAttribute('aria-label')).toBe('Collapse player: No track selected — The12thHouse');
    expect(container.querySelector('.player-icon--plus, .player-icon--minus')).toBeNull();
  });

  it('stays open for interaction inside the player and closes on a pointer outside it', () => {
    renderPlayer();
    dispatchClick(container.querySelector('.player-strip__meta')!);

    const strip = container.querySelector('button.player-strip') as HTMLButtonElement;
    expect(strip.getAttribute('aria-expanded')).toBe('true');

    dispatchPointerDown(container.querySelector('.player-detail__topbar')!);
    expect(strip.getAttribute('aria-expanded')).toBe('true');

    const outside = document.createElement('button');
    outside.textContent = 'Outside player';
    document.body.appendChild(outside);
    dispatchPointerDown(outside);
    expect(strip.getAttribute('aria-expanded')).toBe('false');
    outside.remove();
  });

  it('continues to close the expanded player with Escape', () => {
    renderPlayer();
    dispatchClick(container.querySelector('.player-strip__title')!);
    const strip = container.querySelector('button.player-strip') as HTMLButtonElement;
    expect(strip.getAttribute('aria-expanded')).toBe('true');

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(strip.getAttribute('aria-expanded')).toBe('false');
  });
});

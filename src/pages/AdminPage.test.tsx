import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';

const mocks = vi.hoisted(() => ({
  catalog: {} as Record<string, unknown>,
  addRelease: vi.fn(),
  addTrack: vi.fn(),
  saveTrackAudio: vi.fn(),
  saveArtwork: vi.fn(),
}));

vi.mock('../features/catalog/CatalogProvider', () => ({ useCatalog: () => mocks.catalog }));
vi.mock('../features/analytics/AnalyticsPanel', () => ({ AnalyticsPanel: () => null }));

describe('AdminPage album audio creation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.addRelease.mockReset().mockResolvedValue({ id: 'album-1' });
    mocks.addTrack.mockReset().mockResolvedValueOnce({ id: 'track-1' }).mockResolvedValueOnce({ id: 'track-2' });
    mocks.saveTrackAudio.mockReset().mockResolvedValue({});
    mocks.saveArtwork.mockReset().mockResolvedValue({});
    mocks.catalog = {
      releases: [], homeCardIds: [], homeHeroId: null, homeHeroError: null,
      addRelease: mocks.addRelease, addTrack: mocks.addTrack, saveTrackAudio: mocks.saveTrackAudio,
      saveArtwork: mocks.saveArtwork, removeArtwork: vi.fn(), updateRelease: vi.fn(), updateHomeCard: vi.fn(), updateHomeHero: vi.fn(),
      updateTrack: vi.fn(), removeTrack: vi.fn(), saveTrackOrder: vi.fn(), removeTrackAudio: vi.fn(), saveVisualMedia: vi.fn(), removeVisualMedia: vi.fn(),
      addPlatformLink: vi.fn(), updatePlatformLink: vi.fn(), removePlatformLink: vi.fn(), user: null, isReady: true, isRemote: false,
      catalogError: null, isRecoveringPassword: false, signIn: vi.fn(), signUp: vi.fn(), resetPassword: vi.fn(), updatePassword: vi.fn(), signOut: vi.fn(),
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

  it('accepts audio while creating an album and saves the selected file onto its new track', async () => {
    act(() => root.render(<AdminPage />));
    const clickText = (text: string) => {
      const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim().includes(text));
      if (!button) throw new Error(`Button not found: ${text}`);
      act(() => button.click());
    };
    clickText('RELEASES');
    clickText('ALBUM');
    clickText('Create Album');
    clickText('+ Add Track');
    clickText('+ Add Track');

    const audioInputs = [...container.querySelectorAll('input[type="file"][accept^="audio/"]')] as HTMLInputElement[];
    expect(audioInputs).toHaveLength(2);
    const audioInput = audioInputs[0];
    expect(audioInput).toBeTruthy();
    const file = new File(['audio bytes'], 'album-track.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(audioInput, 'files', { configurable: true, value: [file] });
    act(() => audioInput!.dispatchEvent(new Event('change', { bubbles: true })));
    const secondFile = new File(['second audio bytes'], 'album-track-2.flac', { type: 'audio/flac' });
    Object.defineProperty(audioInputs[1], 'files', { configurable: true, value: [secondFile] });
    act(() => audioInputs[1].dispatchEvent(new Event('change', { bubbles: true })));

    const title = container.querySelector('#new-content-title') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setter?.call(title, 'Test Album');
      title.dispatchEvent(new Event('input', { bubbles: true }));
      title.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form.admin-form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.addRelease).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Album', contentType: 'music', type: 'album' }));
    expect(mocks.addTrack).toHaveBeenCalledTimes(2);
    expect(mocks.addTrack).toHaveBeenCalledWith('album-1', expect.objectContaining({ title: 'Track 01', audio_url: null }));
    expect(mocks.saveTrackAudio).toHaveBeenCalledWith('album-1', 'track-1', file);
    expect(mocks.addTrack).toHaveBeenCalledWith('album-1', expect.objectContaining({ title: 'Track 02', audio_url: null }));
    expect(mocks.saveTrackAudio).toHaveBeenCalledWith('album-1', 'track-2', secondFile);
  });

  it('keeps an audio picker available while creating a single', () => {
    act(() => root.render(<AdminPage />));
    const releasesButton = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('RELEASES'));
    if (!releasesButton) throw new Error('Releases navigation button not found');
    act(() => releasesButton.click());
    const createButton = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('Create Single'));
    if (!createButton) throw new Error('Create Single button not found');
    act(() => createButton.click());
    expect(container.querySelector('input[type="file"][accept^="audio/"]')).toBeTruthy();
  });
});

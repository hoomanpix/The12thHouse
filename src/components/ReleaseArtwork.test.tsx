import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleaseArtwork } from './ReleaseArtwork';

describe('ReleaseArtwork', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('does not issue an image request for a missing or whitespace-only source', () => {
    act(() => root.render(<ReleaseArtwork src="  " title="Night Drive" kindLabel="Music" alt="" />));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Music');
    expect(container.textContent).toContain('Night Drive');
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('trims valid URLs and shows an accessible title/type fallback if loading fails', () => {
    act(() => root.render(<ReleaseArtwork src="  https://cdn.example/cover.jpg  " title="Night Drive" kindLabel="Music" alt="Night Drive cover" />));
    const image = container.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://cdn.example/cover.jpg');
    expect(image.getAttribute('alt')).toBe('Night Drive cover');
    act(() => image.dispatchEvent(new Event('error')));
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Music artwork for Night Drive');
    expect(container.textContent).toContain('Night Drive');
  });
});

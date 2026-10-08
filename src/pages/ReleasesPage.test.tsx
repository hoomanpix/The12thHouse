import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleasesPage } from './ReleasesPage';

const mocks = vi.hoisted(() => ({ catalog: {} as Record<string, unknown> }));
vi.mock('../features/catalog/CatalogProvider', () => ({ useCatalog: () => mocks.catalog }));

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
    vi.unstubAllGlobals();
  });

  it('omits the large Selected work title while retaining the compact page label and filters', () => {
    act(() => root.render(<MemoryRouter><ReleasesPage /></MemoryRouter>));
    expect(container.querySelector('h1')?.textContent).toBe('Releases');
    expect(container.textContent).not.toContain('Selected work');
    expect(Array.from(container.querySelectorAll('.filter-pill')).map((button) => button.textContent)).toEqual(['All', 'single', 'album']);
  });
});

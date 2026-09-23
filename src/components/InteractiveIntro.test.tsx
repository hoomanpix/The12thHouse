import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InteractiveIntro, INTRO_DURATION } from './InteractiveIntro';

describe('InteractiveIntro', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a minimal sliding intro and completes after 2.5 seconds', () => {
    const onComplete = vi.fn();
    act(() => root.render(<InteractiveIntro artistName="The12thHouse" onComplete={onComplete} />));

    expect(container.querySelector('.intro-screen--sliding')).not.toBeNull();
    expect(container.querySelector('.intro-slide-panel')).not.toBeNull();
    expect(container.querySelector('.intro-slide-label')?.textContent).toBe('The12thHouse');
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(INTRO_DURATION - 1));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

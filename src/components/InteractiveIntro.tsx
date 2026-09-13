import { useCallback, useEffect, useRef, useState } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [motionPosition, setMotionPosition] = useState({ x: 0, y: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const finishIntro = useCallback(() => {
    setIsComplete((current) => {
      if (current) {
        return current;
      }

      onComplete?.();
      return true;
    });
  }, [onComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      finishIntro();
      return;
    }

    const tick = () => {
      const nextX = currentRef.current.x + (targetRef.current.x - currentRef.current.x) * 0.12;
      const nextY = currentRef.current.y + (targetRef.current.y - currentRef.current.y) * 0.12;

      currentRef.current = { x: nextX, y: nextY };
      setMotionPosition({ x: nextX, y: nextY });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [reducedMotion, finishIntro]);

  const updateTarget = useCallback((clientX: number, clientY: number) => {
    targetRef.current = {
      x: clientX,
      y: clientY,
    };

    setHasInteracted(true);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      updateTarget(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      updateTarget(touch.clientX, touch.clientY);
    };

    const handleCommit = () => {
      if (hasInteracted) {
        finishIntro();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (hasInteracted) {
          finishIntro();
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleCommit, { passive: true });
    window.addEventListener('touchend', handleCommit, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleCommit);
      window.removeEventListener('touchend', handleCommit);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishIntro, hasInteracted, updateTarget]);

  const distance = Math.hypot(motionPosition.x, motionPosition.y);
  const opacity = hasInteracted ? Math.min(1, 0.2 + distance / 1800) : 0;
  const scale = hasInteracted ? 1 + Math.min(distance / 2200, 0.16) : 1;

  return (
    <div className={isComplete ? 'intro-screen intro-screen--hidden' : 'intro-screen'} aria-hidden={isComplete}>
      {hasInteracted ? (
        <div
          className="intro-name"
          aria-label={artistName}
          style={{
            opacity,
            transform: `translate3d(${motionPosition.x}px, ${motionPosition.y}px, 0) translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {artistName}
        </div>
      ) : null}
    </div>
  );
}

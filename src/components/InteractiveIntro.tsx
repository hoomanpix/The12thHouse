import { useCallback, useEffect, useRef, useState } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const [isComplete, setIsComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const completionRef = useRef<number | null>(null);

  const finishIntro = useCallback(() => {
    if (isComplete) {
      return;
    }

    setIsComplete(true);
    onComplete?.();
  }, [isComplete, onComplete]);

  const introOpacity = 0.08 + ((pointer.x - 12) / 88) * 0.38 + ((pointer.y - 15) / 85) * 0.18;
  const introXShift = (pointer.x - 50) * 0.18;
  const introYShift = (pointer.y - 50) * 0.18;

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

    const updatePointerFromEvent = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setPointer({ x, y });
      });

      if (completionRef.current !== null) {
        window.clearTimeout(completionRef.current);
      }

      completionRef.current = window.setTimeout(() => {
        finishIntro();
      }, 420);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerFromEvent(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      updatePointerFromEvent(touch.clientX, touch.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      if (completionRef.current !== null) {
        window.clearTimeout(completionRef.current);
      }
    };
  }, [finishIntro, reducedMotion]);

  return (
    <div
      className={isComplete ? 'intro-screen intro-screen--hidden' : 'intro-screen'}
      aria-hidden={isComplete}
      style={{
        ['--pointer-x' as string]: `${pointer.x}%`,
        ['--pointer-y' as string]: `${pointer.y}%`,
      }}
    >
      <div className="intro-veil" aria-hidden="true" />
      <div
        className="intro-name"
        aria-label={artistName}
        style={{
          opacity: Math.min(1, Math.max(0.08, introOpacity)),
          transform: `translate(${introXShift}px, ${introYShift}px) scale(1.04)`,
        }}
      >
        {artistName}
      </div>
    </div>
  );
}

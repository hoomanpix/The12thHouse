import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

type IntroCharacter = {
  id: number;
  char: string;
  x: number;
  y: number;
};

const CHARACTER_SPACING = 6;
const BASE_REVEAL_DISTANCE = 72;
const COMPLETION_PAUSE_DURATION = 4000;
const FADE_DURATION = 1200;

const safeScrollToTop = () => {
  try {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    // Ignore unsupported browser scroll implementations during tests or restricted environments.
  }
};

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);

  const characters = useMemo(() => artistName.toUpperCase().split(''), [artistName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const accumulatorRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  const triggerComplete = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }

    dismissedRef.current = true;
    setIsDismissed(true);
    onComplete?.();
  }, [onComplete]);

  const completeIntro = useCallback(() => {
    if (completionStartedRef.current || dismissedRef.current) {
      return;
    }

    completionStartedRef.current = true;
    setIsComplete(true);
  }, []);

  useEffect(() => {
    prefersReducedMotionRef.current =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
  }, []);

  useEffect(() => {
    if (!isComplete || isDismissed) {
      return undefined;
    }

    if (prefersReducedMotionRef.current) {
      const timer = window.setTimeout(triggerComplete, 160);
      return () => window.clearTimeout(timer);
    }

    const fadeTimer = window.setTimeout(() => setIsFading(true), COMPLETION_PAUSE_DURATION);
    const completionTimer = window.setTimeout(triggerComplete, COMPLETION_PAUSE_DURATION + FADE_DURATION);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completionTimer);
    };
  }, [isComplete, isDismissed, triggerComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      safeScrollToTop();
    };
  }, []);

  useEffect(() => {
    if (isDismissed || isComplete) {
      return undefined;
    }

    const handleMotion = (clientX: number, clientY: number, deltaX: number, deltaY: number) => {
      if (dismissedRef.current) {
        return;
      }

      const lastPoint = pointerRef.current ?? { x: clientX, y: clientY };
      const pointerDeltaX = clientX - lastPoint.x;
      const pointerDeltaY = clientY - lastPoint.y;
      const eventDeltaX = Number.isFinite(deltaX) && Math.abs(deltaX) > 0.1 ? deltaX : pointerDeltaX;
      const eventDeltaY = Number.isFinite(deltaY) && Math.abs(deltaY) > 0.1 ? deltaY : pointerDeltaY;
      const distance = Math.hypot(eventDeltaX, eventDeltaY);

      pointerRef.current = { x: clientX, y: clientY };

      if (distance <= 0.1) {
        return;
      }

      accumulatorRef.current += distance;

      if (accumulatorRef.current < BASE_REVEAL_DISTANCE) {
        return;
      }

      const nextIndex = revealedCountRef.current;
      if (nextIndex >= characters.length) {
        completeIntro();
        return;
      }

      const directionX = eventDeltaX || 1;
      const directionY = eventDeltaY || 0;
      const angle = Math.atan2(directionY, directionX);
      const offset = nextIndex * CHARACTER_SPACING;
      const nextCharacter = {
        id: nextIndex,
        char: characters[nextIndex],
        x: clientX + Math.cos(angle) * offset,
        y: clientY + Math.sin(angle) * offset,
      };

      setRevealedCharacters((previous) => [...previous, nextCharacter]);
      revealedCountRef.current += 1;
      accumulatorRef.current = 0;

      if (revealedCountRef.current >= characters.length) {
        completeIntro();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleMotion(event.clientX, event.clientY, event.deltaX, event.deltaY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) {
        return;
      }

      event.preventDefault();
      const deltaX = touch.clientX - (pointerRef.current?.x ?? touch.clientX);
      const deltaY = touch.clientY - (pointerRef.current?.y ?? touch.clientY);
      handleMotion(touch.clientX, touch.clientY, deltaX, deltaY);
    };

    const handleScroll = () => {
      if (!dismissedRef.current) {
        safeScrollToTop();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('scroll', handleScroll, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [characters, completeIntro, isComplete, isDismissed]);

  return (
    <div
      className={['intro-screen', isFading ? 'intro-screen--fading' : '', isDismissed ? 'intro-screen--hidden' : '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden={isDismissed}
    >
      <div className="intro-assembly" aria-label={artistName}>
        {revealedCharacters.map((character) => {
          const characterStyle: CSSProperties = {
            left: `${character.x}px`,
            top: `${character.y}px`,
          };

          return (
            <span
              key={`${character.id}-${character.char}`}
              className={['intro-character', character.char === ' ' ? 'intro-character--space' : '']
                .filter(Boolean)
                .join(' ')}
              style={characterStyle}
              aria-hidden={character.char === ' '}
            >
              {character.char}
            </span>
          );
        })}
      </div>
      <div className="intro-black-continuation" aria-hidden="true" />
    </div>
  );
}

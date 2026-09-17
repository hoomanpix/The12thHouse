import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface InteractiveIntroProps { artistName: string; onComplete?: () => void; }
type IntroCharacter = { id: number; char: string; x: number; y: number };
const MIN_PLACEMENT_DISTANCE = 32;
const COMPLETION_PAUSE_DURATION = 4000;
const FADE_DURATION = 1600;

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);
  const displayName = useMemo(() => artistName.trim().split(/\s+/).map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(' '), [artistName]);
  const characters = useMemo(() => displayName.split(''), [displayName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pathDistanceRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  const triggerComplete = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsDismissed(true);
    onComplete?.();
  }, [onComplete]);

  const completeIntro = useCallback(() => {
    if (completionStartedRef.current || dismissedRef.current) return;
    completionStartedRef.current = true;
    setIsComplete(true);
  }, []);

  useEffect(() => {
    prefersReducedMotionRef.current = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }, []);

  useEffect(() => {
    if (!isComplete || isDismissed) return undefined;
    if (prefersReducedMotionRef.current) {
      const timer = window.setTimeout(triggerComplete, 160);
      return () => window.clearTimeout(timer);
    }
    const fadeTimer = window.setTimeout(() => setIsFading(true), COMPLETION_PAUSE_DURATION);
    const completionTimer = window.setTimeout(triggerComplete, COMPLETION_PAUSE_DURATION + FADE_DURATION);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(completionTimer); };
  }, [isComplete, isDismissed, triggerComplete]);

  useEffect(() => {
    if (isDismissed || isComplete) return undefined;

    const handleMotion = (clientX: number, clientY: number, deltaX: number, deltaY: number) => {
      if (dismissedRef.current || revealedCountRef.current >= characters.length) return;
      const lastPoint = pointerRef.current ?? { x: clientX, y: clientY };
      const pointerDeltaX = clientX - lastPoint.x;
      const pointerDeltaY = clientY - lastPoint.y;
      const eventDeltaX = Number.isFinite(deltaX) && Math.abs(deltaX) > 0.1 ? deltaX : pointerDeltaX;
      const eventDeltaY = Number.isFinite(deltaY) && Math.abs(deltaY) > 0.1 ? deltaY : pointerDeltaY;
      const distance = Math.hypot(eventDeltaX, eventDeltaY);
      pointerRef.current = { x: clientX, y: clientY };
      if (distance <= 0.1) return;

      pathDistanceRef.current += distance;
      if (pathDistanceRef.current < MIN_PLACEMENT_DISTANCE) return;
      const angle = Math.atan2(eventDeltaY || 0, eventDeltaX || 1);
      const newCharacters: IntroCharacter[] = [];

      while (pathDistanceRef.current >= MIN_PLACEMENT_DISTANCE && revealedCountRef.current < characters.length) {
        const placementDistance = pathDistanceRef.current - MIN_PLACEMENT_DISTANCE / 2;
        newCharacters.push({
          id: revealedCountRef.current,
          char: characters[revealedCountRef.current],
          x: clientX - Math.cos(angle) * placementDistance,
          y: clientY - Math.sin(angle) * placementDistance,
        });
        revealedCountRef.current += 1;
        pathDistanceRef.current -= MIN_PLACEMENT_DISTANCE;
      }

      if (newCharacters.length > 0) setRevealedCharacters((previous) => [...previous, ...newCharacters]);
      if (revealedCountRef.current >= characters.length) completeIntro();
    };

    const handlePointerMove = (event: PointerEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleMouseMoveFallback = (event: MouseEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleWheel = (event: WheelEvent) => handleMotion(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, event.deltaX, event.deltaY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return;
      handleMotion(touch.clientX, touch.clientY, touch.clientX - (pointerRef.current?.x ?? touch.clientX), touch.clientY - (pointerRef.current?.y ?? touch.clientY));
    };

    window.addEventListener('pointermove', handlePointerMove);
    if (typeof window.PointerEvent === 'undefined') window.addEventListener('mousemove', handleMouseMoveFallback);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMoveFallback);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [characters, completeIntro, isComplete, isDismissed]);

  return <div className={['intro-screen', isFading ? 'intro-screen--fading' : '', isDismissed ? 'intro-screen--hidden' : ''].filter(Boolean).join(' ')} aria-hidden={isDismissed}><div className="intro-assembly" aria-label={displayName}>{revealedCharacters.map((character) => { const characterStyle: CSSProperties = { left: `${character.x}px`, top: `${character.y}px` }; return <span key={`${character.id}-${character.char}`} className={['intro-character', character.char === ' ' ? 'intro-character--space' : ''].filter(Boolean).join(' ')} style={characterStyle} aria-hidden={character.char === ' '}>{character.char}</span>; })}</div></div>;
}

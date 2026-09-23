import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface InteractiveIntroProps { artistName: string; onComplete?: () => void; }
type IntroCharacter = { id: number; char: string; x: number; y: number; angle: number };
const BASE_PLACEMENT_DISTANCE = 42;
const CHARACTER_CLEARANCE = 6;
const COMPLETION_PAUSE_DURATION = 2500;

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState<IntroCharacter[]>([]);
  const displayName = useMemo(() => artistName.trim().split(/\s+/).map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(' '), [artistName]);
  const characters = useMemo(() => displayName.split(''), [displayName]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pathDistanceRef = useRef(0);
  const revealedCountRef = useRef(0);
  const dismissedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  const getPlacementDistance = useCallback(() => {
    const viewportFontSize = Math.min(42, Math.max(26, window.innerWidth * 0.02));
    return Math.max(BASE_PLACEMENT_DISTANCE, viewportFontSize + CHARACTER_CLEARANCE);
  }, []);

  const triggerComplete = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setIsDismissed(true);
    transitionTimerRef.current = window.setTimeout(() => onComplete?.(), COMPLETION_PAUSE_DURATION);
  }, [onComplete]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
  }, []);

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
    const completionTimer = window.setTimeout(triggerComplete, COMPLETION_PAUSE_DURATION);
    return () => window.clearTimeout(completionTimer);
  }, [isComplete, isDismissed, triggerComplete]);

  useEffect(() => {
    if (isDismissed || isComplete) return undefined;

    const handleMotion = (clientX: number, clientY: number, deltaX: number, deltaY: number) => {
      if (dismissedRef.current || revealedCountRef.current >= characters.length) return;
      const previous = pointerRef.current;
      if (!previous) {
        pointerRef.current = { x: clientX, y: clientY };
        return;
      }

      const segmentX = Number.isFinite(deltaX) && Math.abs(deltaX) > 0.1 ? deltaX : clientX - previous.x;
      const segmentY = Number.isFinite(deltaY) && Math.abs(deltaY) > 0.1 ? deltaY : clientY - previous.y;
      const segmentDistance = Math.hypot(segmentX, segmentY);
      let angle = Math.atan2(segmentY, segmentX);
      if (angle > Math.PI / 2) angle -= Math.PI;
      if (angle < -Math.PI / 2) angle += Math.PI;
      pointerRef.current = { x: clientX, y: clientY };
      if (segmentDistance <= 0.1) return;

      const newCharacters: IntroCharacter[] = [];
      let consumed = 0;
      const placementDistance = getPlacementDistance();
      while (pathDistanceRef.current + segmentDistance - consumed >= placementDistance && revealedCountRef.current < characters.length) {
        const distanceToPlacement = placementDistance - pathDistanceRef.current;
        consumed += distanceToPlacement;
        const ratio = Math.min(1, consumed / segmentDistance);
        const x = previous.x + segmentX * ratio;
        const y = previous.y + segmentY * ratio;
        newCharacters.push({
          id: revealedCountRef.current,
          char: characters[revealedCountRef.current],
          x,
          y,
          angle,
        });
        revealedCountRef.current += 1;
        pathDistanceRef.current = 0;
      }
      pathDistanceRef.current += segmentDistance - consumed;
      if (newCharacters.length > 0) setRevealedCharacters((current) => [...current, ...newCharacters]);
      if (revealedCountRef.current >= characters.length) completeIntro();
    };

    const handlePointerMove = (event: PointerEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleMouseMoveFallback = (event: MouseEvent) => handleMotion(event.clientX, event.clientY, event.movementX, event.movementY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return;
      handleMotion(touch.clientX, touch.clientY, touch.clientX - (pointerRef.current?.x ?? touch.clientX), touch.clientY - (pointerRef.current?.y ?? touch.clientY));
    };

    window.addEventListener('pointermove', handlePointerMove);
    if (typeof window.PointerEvent === 'undefined') window.addEventListener('mousemove', handleMouseMoveFallback);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMoveFallback);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [characters, completeIntro, getPlacementDistance, isComplete, isDismissed]);

  return <div className={['intro-screen', isDismissed ? 'intro-screen--hidden' : ''].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={`${displayName} intro`} aria-hidden={isDismissed}>
    <div className="intro-assembly" aria-hidden="true">{revealedCharacters.map((character) => { const characterStyle: CSSProperties = { left: `${character.x}px`, top: `${character.y}px`, transform: `translate(-50%, -50%) rotate(${character.angle}rad)` }; return <span key={`${character.id}-${character.char}`} className={['intro-character', character.char === ' ' ? 'intro-character--space' : ''].filter(Boolean).join(' ')} style={characterStyle}>{character.char}</span>; })}</div>
  </div>;
}

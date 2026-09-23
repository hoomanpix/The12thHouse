import { useEffect } from 'react';

export interface InteractiveIntroProps {
  artistName: string;
  onComplete?: () => void;
}

const INTRO_DURATION = 2500;

export function InteractiveIntro({ artistName, onComplete }: InteractiveIntroProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onComplete?.(), INTRO_DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="intro-screen intro-screen--sliding" role="dialog" aria-modal="true" aria-label={`${artistName} intro`}>
      <div className="intro-slide-panel" aria-hidden="true" />
      <p className="intro-slide-label">{artistName}</p>
    </div>
  );
}

export { INTRO_DURATION };

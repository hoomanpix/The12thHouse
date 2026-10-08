import { useEffect, useRef } from 'react';

interface VisualVideoPreviewProps {
  src: string;
  poster?: string;
}

export function VisualVideoPreview({ src, poster }: VisualVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let isNearViewport = false;
    const playWhenAllowed = () => {
      if (motionPreference?.matches) {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };
    const handleMotionPreferenceChange = () => {
      if (motionPreference?.matches) video.pause();
      else if (isNearViewport) playWhenAllowed();
    };

    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target !== video) continue;
          isNearViewport = entry.isIntersecting;
          if (isNearViewport) playWhenAllowed();
          else video.pause();
        }
      }, { rootMargin: '160px 0px', threshold: 0.01 });

    if (observer) observer.observe(video);
    else {
      isNearViewport = true;
      playWhenAllowed();
    }
    motionPreference?.addEventListener?.('change', handleMotionPreferenceChange);

    return () => {
      observer?.disconnect();
      motionPreference?.removeEventListener?.('change', handleMotionPreferenceChange);
      video.pause();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="release-video-preview"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

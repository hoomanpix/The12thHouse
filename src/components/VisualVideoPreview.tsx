import { useEffect, useRef, useState } from 'react';
import { ReleaseArtwork } from './ReleaseArtwork';

interface VisualVideoPreviewProps {
  src: string;
  poster?: string | null;
  title?: string;
}

export function VisualVideoPreview({ src, poster, title = 'Visual animation' }: VisualVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const source = typeof src === 'string' ? src.trim() : '';
  const posterSource = typeof poster === 'string' ? poster.trim() : '';
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const hasPlaybackError = !source || failedSource === source;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasPlaybackError) return undefined;

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
  }, [source, hasPlaybackError]);

  if (hasPlaybackError) {
    return <ReleaseArtwork
      src={posterSource || null}
      title={title}
      kindLabel="Visual animation"
      alt=""
      imageClassName="release-video-fallback"
      placeholderClassName="release-video-fallback release-video-fallback--placeholder"
    />;
  }

  return (
    <video
      ref={videoRef}
      className="release-video-preview"
      src={source}
      poster={posterSource || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setFailedSource(source)}
    />
  );
}

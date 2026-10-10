import { useState } from 'react';

interface ReleaseArtworkProps {
  src?: string | null;
  title: string;
  kindLabel: string;
  alt: string;
  imageClassName?: string;
  placeholderClassName?: string;
  loading?: 'eager' | 'lazy';
}

export function ReleaseArtwork({
  src,
  title,
  kindLabel,
  alt,
  imageClassName = 'release-artwork-image',
  placeholderClassName = 'release-artwork-placeholder',
  loading = 'lazy',
}: ReleaseArtworkProps) {
  const source = typeof src === 'string' ? src.trim() : '';
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!source || failedSource === source) {
    return (
      <div
        className={placeholderClassName}
        role={alt ? 'img' : undefined}
        aria-label={alt ? `${kindLabel} artwork for ${title}` : undefined}
        aria-hidden={alt ? undefined : true}
      >
        <span>{kindLabel}</span>
        <strong>{title}</strong>
      </div>
    );
  }

  return (
    <img
      className={imageClassName}
      src={source}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailedSource(source)}
    />
  );
}

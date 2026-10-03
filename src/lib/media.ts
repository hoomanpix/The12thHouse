export type VisualMediaKind = 'image' | 'video';

export function visualMediaKind(reference: string | null | undefined): VisualMediaKind {
  const value = (reference ?? '').split('?')[0].toLowerCase();
  return /\.(gif|apng|png|jpe?g|webp|avif|svg)$/.test(value) ? 'image' : 'video';
}

export function visualMediaMime(reference: string | null | undefined) {
  const value = (reference ?? '').split('?')[0].toLowerCase();
  if (value.endsWith('.webm')) return 'video/webm';
  if (value.endsWith('.mov')) return 'video/quicktime';
  if (value.endsWith('.ogv')) return 'video/ogg';
  return 'video/mp4';
}

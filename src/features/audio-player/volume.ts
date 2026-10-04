export const DEFAULT_VOLUME = 0.8;

export function clampVolume(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : DEFAULT_VOLUME));
}

export function applyMediaVolume(media: Pick<HTMLMediaElement, 'volume' | 'muted'>, volume: number, muted: boolean) {
  const nextVolume = clampVolume(volume);
  media.volume = nextVolume;
  media.muted = muted;
  return nextVolume;
}

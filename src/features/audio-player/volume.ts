export const DEFAULT_VOLUME = 0.8;

export function clampVolume(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : DEFAULT_VOLUME));
}

export function supportsMediaElementVolume(media: Pick<HTMLMediaElement, 'volume'>) {
  const previous = media.volume;
  const probeValue = previous === 0.5 ? 0.25 : 0.5;
  try {
    media.volume = probeValue;
    const supported = Math.abs(media.volume - probeValue) < 0.001;
    media.volume = previous;
    return supported;
  } catch {
    try { media.volume = previous; } catch { /* Some browsers expose a read-only property. */ }
    return false;
  }
}

export function applyMediaVolume(
  media: Pick<HTMLMediaElement, 'volume' | 'muted'>,
  volume: number,
  muted: boolean,
  volumeSupported = true,
) {
  const nextVolume = clampVolume(volume);
  if (volumeSupported) {
    try { media.volume = nextVolume; } catch { /* Keep the UI state honest if the platform blocks writes. */ }
  }
  media.muted = muted;
  return clampVolume(media.volume);
}

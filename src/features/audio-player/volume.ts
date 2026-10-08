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

type AudioContextConstructor = new () => AudioContext;
type WindowWithWebkitAudioContext = Window & { webkitAudioContext?: AudioContextConstructor };

export type AudioVolumeGraph = {
  audio: HTMLAudioElement;
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

export function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext ?? null;
}

export function createAudioVolumeGraph(audio: HTMLAudioElement, context: AudioContext): AudioVolumeGraph | null {
  let source: MediaElementAudioSourceNode | null = null;
  let gain: GainNode | null = null;
  try {
    source = context.createMediaElementSource(audio);
    gain = context.createGain();
    source.connect(gain);
    gain.connect(context.destination);
    return { audio, context, source, gain };
  } catch {
    try { source?.disconnect(); } catch { /* Release a partially-created graph. */ }
    try { gain?.disconnect(); } catch { /* Release a partially-created graph. */ }
    return null;
  }
}

export function applyGainVolume(graph: AudioVolumeGraph, volume: number, muted: boolean) {
  const nextVolume = muted ? 0 : clampVolume(volume);
  const parameter = graph.gain.gain;
  const now = graph.context.currentTime;
  try {
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(nextVolume, now, 0.015);
  } catch {
    parameter.value = nextVolume;
  }
  return nextVolume;
}

export function disconnectAudioVolumeGraph(graph: AudioVolumeGraph) {
  try { graph.source.disconnect(); } catch { /* The source may already be disconnected. */ }
  try { graph.gain.disconnect(); } catch { /* The gain may already be disconnected. */ }
}

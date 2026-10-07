export function formatMediaDuration(value: number | undefined | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${Math.floor(totalSeconds / 60)}:${seconds}`;
}

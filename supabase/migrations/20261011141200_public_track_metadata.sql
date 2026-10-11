-- Publicly expose only track metadata needed to render disabled rows.
-- Audio URLs, storage paths, play counts, and other track columns remain private.
DROP VIEW IF EXISTS public.public_track_metadata;

CREATE VIEW public.public_track_metadata AS
SELECT
  tracks.id,
  tracks.album_id,
  tracks.title,
  tracks.track_order,
  tracks.published
FROM public.tracks AS tracks
JOIN public.albums AS albums ON albums.id = tracks.album_id
WHERE albums.status IN ('published', 'upcoming');

GRANT SELECT ON public.public_track_metadata TO anon, authenticated;

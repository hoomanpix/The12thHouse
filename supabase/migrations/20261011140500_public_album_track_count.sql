-- Expose only the number of persisted tracks for public album pages.
-- Track titles, storage paths, and unpublished rows remain protected by the
-- existing tracks RLS policies.
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS track_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.albums
  DROP CONSTRAINT IF EXISTS albums_track_count_nonnegative;

ALTER TABLE public.albums
  ADD CONSTRAINT albums_track_count_nonnegative CHECK (track_count >= 0);

UPDATE public.albums AS albums
SET track_count = counts.total_tracks
FROM (
  SELECT album_id, count(*)::integer AS total_tracks
  FROM public.tracks
  GROUP BY album_id
) AS counts
WHERE albums.id = counts.album_id;

UPDATE public.albums
SET track_count = 0
WHERE track_count IS NULL;

CREATE OR REPLACE FUNCTION public.refresh_album_track_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected_album_id uuid;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    affected_album_id := OLD.album_id;
    UPDATE public.albums
    SET track_count = (SELECT count(*)::integer FROM public.tracks WHERE album_id = affected_album_id)
    WHERE id = affected_album_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    affected_album_id := NEW.album_id;
    UPDATE public.albums
    SET track_count = (SELECT count(*)::integer FROM public.tracks WHERE album_id = affected_album_id)
    WHERE id = affected_album_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_album_track_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_album_track_count() FROM anon, authenticated;

DROP TRIGGER IF EXISTS refresh_album_track_count_after_track_change ON public.tracks;

CREATE TRIGGER refresh_album_track_count_after_track_change
AFTER INSERT OR UPDATE OF album_id OR DELETE ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.refresh_album_track_count();

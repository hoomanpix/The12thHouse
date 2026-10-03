-- Preview migration only. Do not apply to production without explicit approval.
-- Repair the public data flow while preserving admin-only writes.

DROP POLICY IF EXISTS "published albums are public" ON public.albums;
CREATE POLICY "published and upcoming albums are public"
  ON public.albums
  FOR SELECT
  TO public
  USING (
    published = true
    OR status IN ('upcoming', 'published')
    OR has_role('artist')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS "published tracks are public" ON public.tracks;
CREATE POLICY "tracks for public releases are public"
  ON public.tracks
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums
      WHERE albums.id = tracks.album_id
        AND (
          albums.published = true
          OR albums.status IN ('upcoming', 'published')
          OR has_role('artist')
          OR has_role('admin')
        )
    )
  );

DROP POLICY IF EXISTS "platform_links_public_read" ON public.platform_links;
CREATE POLICY "platform links for public releases are public"
  ON public.platform_links
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums
      WHERE albums.id = platform_links.album_id
        AND (
          albums.published = true
          OR albums.status IN ('upcoming', 'published')
          OR has_role('artist')
          OR has_role('admin')
        )
    )
  );

-- Storage upload uses INSERT ... RETURNING. Admins need SELECT on their own
-- newly-created metadata row, while anonymous users must not read private audio.
DROP POLICY IF EXISTS "public can read published media" ON storage.objects;
CREATE POLICY "public can read published media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id IN ('covers', 'artist-assets')
    OR can_manage_the12thhouse()
    OR (
      bucket_id = 'audio'
      AND EXISTS (
        SELECT 1
        FROM public.tracks
        WHERE tracks.audio_url LIKE '%' || objects.name
          AND tracks.published = true
      )
    )
  );

DROP POLICY IF EXISTS "artists upload media" ON storage.objects;
CREATE POLICY "artists upload media"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    can_manage_the12thhouse()
    AND bucket_id IN ('audio', 'covers', 'artist-assets')
  );

DROP POLICY IF EXISTS "artists update media" ON storage.objects;
CREATE POLICY "artists update media"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (can_manage_the12thhouse())
  WITH CHECK (can_manage_the12thhouse());

DROP POLICY IF EXISTS "artists delete media" ON storage.objects;
CREATE POLICY "artists delete media"
  ON storage.objects
  FOR DELETE
  TO public
  USING (can_manage_the12thhouse());

DROP FUNCTION IF EXISTS public.increment_track_play(uuid);
CREATE OR REPLACE FUNCTION public.increment_track_play(p_track_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.tracks
  SET play_count = play_count + 1
  WHERE id = p_track_id
    AND published = true
    AND audio_url IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.increment_track_play(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_track_play(uuid) TO anon, authenticated;

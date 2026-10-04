-- Repair Admin writes and public media reads without disabling RLS.
-- The approved artist is authorized by the existing JWT-email gate.

DROP POLICY IF EXISTS albums_only_approved_admin ON public.albums;
CREATE POLICY albums_only_approved_admin
  ON public.albums
  FOR ALL
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS tracks_only_approved_admin ON public.tracks;
CREATE POLICY tracks_only_approved_admin
  ON public.tracks
  FOR ALL
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS platform_links_only_approved_admin ON public.platform_links;
CREATE POLICY platform_links_only_approved_admin
  ON public.platform_links
  FOR ALL
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS home_cards_only_approved_admin ON public.home_cards;
CREATE POLICY home_cards_only_approved_admin
  ON public.home_cards
  FOR ALL
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS "artists upload media" ON storage.objects;
CREATE POLICY "artists upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_the12thhouse()
    AND bucket_id IN ('audio', 'covers', 'artist-assets')
  );

DROP POLICY IF EXISTS "artists update media" ON storage.objects;
CREATE POLICY "artists update media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS "artists delete media" ON storage.objects;
CREATE POLICY "artists delete media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (public.can_manage_the12thhouse());

DROP POLICY IF EXISTS "public can read published media" ON storage.objects;
CREATE POLICY "public can read published media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id IN ('covers', 'artist-assets')
    OR (
      bucket_id = 'audio'
      AND EXISTS (
        SELECT 1
        FROM public.tracks
        WHERE public.tracks.audio_url = storage.objects.name
          AND public.tracks.published IS TRUE
      )
    )
  );

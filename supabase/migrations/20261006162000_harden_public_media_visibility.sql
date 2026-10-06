-- Final handoff security hardening: public users may only read public releases and their published audio.
DROP POLICY IF EXISTS "published albums are public" ON public.albums;
CREATE POLICY "published albums are public"
  ON public.albums FOR SELECT TO public
  USING (status IN ('published', 'upcoming') OR published IS TRUE);

DROP POLICY IF EXISTS "published tracks are public" ON public.tracks;
CREATE POLICY "published tracks are public"
  ON public.tracks FOR SELECT TO public
  USING (
    published IS TRUE
    AND EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = tracks.album_id
        AND (a.status = 'published' OR a.published IS TRUE)
    )
  );

DROP POLICY IF EXISTS platform_links_public_read ON public.platform_links;
CREATE POLICY platform_links_public_read
  ON public.platform_links FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = platform_links.album_id
        AND (a.status IN ('published', 'upcoming') OR a.published IS TRUE)
    )
  );

DROP POLICY IF EXISTS home_cards_public_read ON public.home_cards;
CREATE POLICY home_cards_public_read
  ON public.home_cards FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = home_cards.album_id
        AND (a.status IN ('published', 'upcoming') OR a.published IS TRUE)
    )
  );

DROP POLICY IF EXISTS "public can read published media" ON storage.objects;
CREATE POLICY "public can read published media"
  ON storage.objects FOR SELECT TO public
  USING (
    (
      bucket_id IN ('covers', 'artist-assets')
      AND EXISTS (
        SELECT 1 FROM public.albums a
        WHERE (a.status IN ('published', 'upcoming') OR a.published IS TRUE)
          AND (
            a.cover_url LIKE '%' || storage.objects.name
            OR a.visual_url LIKE '%' || storage.objects.name
          )
      )
    )
    OR (
      bucket_id = 'audio'
      AND EXISTS (
        SELECT 1
        FROM public.tracks t
        JOIN public.albums a ON a.id = t.album_id
        WHERE t.audio_url = storage.objects.name
          AND t.published IS TRUE
          AND (a.status = 'published' OR a.published IS TRUE)
      )
    )
  );

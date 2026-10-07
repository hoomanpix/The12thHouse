-- Persist the Home Hero content selection independently from albums.featured
-- and the three Home release-card slots.
CREATE TABLE public.home_hero (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  release_id uuid REFERENCES public.albums(id) ON DELETE SET NULL
);

ALTER TABLE public.home_hero ENABLE ROW LEVEL SECURITY;

-- The public site can read only an empty Hero setting or a public release.
CREATE POLICY home_hero_public_read
  ON public.home_hero
  FOR SELECT
  TO anon, authenticated
  USING (
    release_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.albums AS a
      WHERE a.id = home_hero.release_id
        AND (a.status = 'published' OR a.published IS TRUE)
    )
  );

-- Keep writes behind the same approved-artist gate as the existing Admin tables.
CREATE POLICY home_hero_only_approved_admin
  ON public.home_hero
  FOR ALL
  TO authenticated
  USING (public.can_manage_the12thhouse())
  WITH CHECK (public.can_manage_the12thhouse());

-- Supabase Data API grants are independent from RLS and must be explicit.
GRANT SELECT ON TABLE public.home_hero TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.home_hero TO authenticated;

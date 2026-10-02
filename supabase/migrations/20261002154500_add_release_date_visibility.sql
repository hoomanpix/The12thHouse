-- Preview migration only. Apply after approval.
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS show_release_date boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.albums.show_release_date IS
  'For Upcoming releases, controls whether the public release date is shown or replaced by TBA.';

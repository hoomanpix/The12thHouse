-- Preview migration only. Apply to Supabase after preview approval.
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.albums
  DROP CONSTRAINT IF EXISTS albums_status_check;

ALTER TABLE public.albums
  ADD CONSTRAINT albums_status_check CHECK (status IN ('draft', 'upcoming', 'published'));

UPDATE public.albums
SET status = CASE
  WHEN published IS TRUE THEN 'published'
  WHEN release_date IS NOT NULL AND release_date > CURRENT_DATE THEN 'upcoming'
  ELSE 'draft'
END
WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS albums_status_idx ON public.albums (status);

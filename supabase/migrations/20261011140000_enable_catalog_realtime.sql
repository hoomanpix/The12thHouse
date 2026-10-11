-- Preview-only migration. Apply to Supabase only after explicit approval.
-- Enables database change events for the catalog tables used by the public site
-- and admin panel. The block is idempotent when rerun.
DO $$
DECLARE
  table_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'supabase_realtime publication is not available';
  END IF;

  FOREACH table_name IN ARRAY ARRAY['albums', 'tracks', 'platform_links', 'home_cards', 'home_hero'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END
$$;

-- Review migration for a concurrency-aware atomic album track reorder.
-- Apply only after frontend verification and explicit production approval.
-- SECURITY INVOKER preserves the caller's RLS context.
CREATE OR REPLACE FUNCTION public.reorder_album_tracks(
  p_album_id uuid,
  p_track_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  album_content_type text;
  expected_count integer;
  requested_count integer;
  matched_count integer;
  updated_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT public.can_manage_the12thhouse()) THEN
    RAISE EXCEPTION 'Only the approved catalog manager can reorder tracks.'
      USING ERRCODE = '42501';
  END IF;

  IF p_album_id IS NULL
     OR p_track_ids IS NULL
     OR cardinality(p_track_ids) = 0
     OR array_position(p_track_ids, NULL::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'A non-empty track ID array without NULL values is required.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize reorder operations for this album before reading its track set.
  SELECT a.content_type
    INTO album_content_type
  FROM public.albums AS a
  WHERE a.id = p_album_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Album does not exist.' USING ERRCODE = '22023';
  END IF;

  IF album_content_type <> 'music' THEN
    RAISE EXCEPTION 'Track ordering is available only for music releases.'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
    INTO expected_count
  FROM public.tracks AS t
  WHERE t.album_id = p_album_id;

  requested_count := cardinality(p_track_ids);

  IF EXISTS (
    SELECT 1
    FROM unnest(p_track_ids) AS requested(track_id)
    GROUP BY requested.track_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Track IDs must be unique.' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
    INTO matched_count
  FROM public.tracks AS t
  WHERE t.album_id = p_album_id
    AND t.id = ANY (p_track_ids);

  IF expected_count <> requested_count OR matched_count <> requested_count THEN
    RAISE EXCEPTION 'Track IDs must cover exactly every track in the album.'
      USING ERRCODE = '22023';
  END IF;

  WITH requested AS (
    SELECT track_id, ord::integer AS track_order
    FROM unnest(p_track_ids) WITH ORDINALITY AS item(track_id, ord)
  )
  UPDATE public.tracks AS t
  SET track_order = requested.track_order
  FROM requested
  WHERE t.id = requested.track_id
    AND t.album_id = p_album_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> requested_count THEN
    RAISE EXCEPTION 'Track ordering did not update the complete album.'
      USING ERRCODE = '40001';
  END IF;

  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) TO authenticated;

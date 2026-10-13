-- Review migration for an all-or-nothing repair of six audited track orders.
-- Apply only after frontend verification and explicit production approval.
-- The block locks and validates every target before issuing the single update.
DO $$
DECLARE
  target_album uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  target_ids uuid[] := ARRAY[
    '611db515-619a-4d06-9353-c6a80710e3ff'::uuid,
    '63ad52b6-9855-4443-a6eb-57916924cbf6'::uuid,
    'b3787472-e29b-47fa-8eba-8e9dd10a5763'::uuid,
    '99af06c6-dccd-4dcd-b1a6-d15b4282b43c'::uuid,
    '3146c863-fcbd-4adb-9fb5-a803783b3d6f'::uuid,
    '699f10ba-7a76-468f-9bcd-e36ba8d5ab11'::uuid
  ];
  target_titles text[] := ARRAY['Track 01', 'Track 02', 'Track 03', 'Track 04', 'Track 05', 'Track 06'];
  old_orders integer[] := ARRAY[-1, -2, -3, -4, -5, -6];
  new_orders integer[] := ARRAY[1, 2, 3, 4, 5, 6];
  row_album uuid;
  row_title text;
  row_order integer;
  all_old boolean := true;
  all_new boolean := true;
  updated_count integer;
BEGIN
  IF cardinality(target_ids) <> 6
     OR cardinality(target_titles) <> 6
     OR cardinality(old_orders) <> 6
     OR cardinality(new_orders) <> 6 THEN
    RAISE EXCEPTION 'Repair contract must contain exactly six targets.';
  END IF;

  FOR i IN 1..6 LOOP
    SELECT t.album_id, t.title, t.track_order
      INTO row_album, row_title, row_order
    FROM public.tracks AS t
    WHERE t.id = target_ids[i]
    FOR UPDATE;

    IF NOT FOUND
       OR row_album IS DISTINCT FROM target_album
       OR row_title IS DISTINCT FROM target_titles[i] THEN
      RAISE EXCEPTION 'Repair target % is missing or does not match the audited album/title.', target_ids[i];
    END IF;

    IF row_order IS DISTINCT FROM old_orders[i] THEN
      all_old := false;
    END IF;
    IF row_order IS DISTINCT FROM new_orders[i] THEN
      all_new := false;
    END IF;
  END LOOP;

  IF all_new THEN
    RETURN;
  END IF;

  IF NOT all_old THEN
    RAISE EXCEPTION 'Repair state is partial or unexpected; no rows were changed.';
  END IF;

  UPDATE public.tracks AS t
  SET track_order = repaired.new_order
  FROM unnest(target_ids, new_orders) AS repaired(track_id, new_order)
  WHERE t.id = repaired.track_id
    AND t.album_id = target_album;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 6 THEN
    RAISE EXCEPTION 'Repair did not update all six audited tracks.';
  END IF;
END;
$$;

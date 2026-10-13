import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rpcMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261013170000_atomic_track_order_rpc.sql'), 'utf8');
const repairMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261013170100_repair_rap_is_art_track_order.sql'), 'utf8');

describe('Stage 1 track-order migration contracts', () => {
  it('uses an invoker RPC with a narrow authenticated execute boundary', () => {
    expect(rpcMigration).toContain('SECURITY INVOKER');
    expect(rpcMigration).toContain("SET search_path = ''");
    expect(rpcMigration).toContain('REVOKE ALL ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) FROM PUBLIC');
    expect(rpcMigration).toContain('REVOKE ALL ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) FROM anon');
    expect(rpcMigration).toContain('GRANT EXECUTE ON FUNCTION public.reorder_album_tracks(uuid, uuid[]) TO authenticated');
    expect(rpcMigration.toLowerCase()).not.toContain('security definer');
  });

  it('validates manager, music album, non-empty unique IDs, and exact membership', () => {
    expect(rpcMigration).toContain('auth.uid()');
    expect(rpcMigration).toContain('public.can_manage_the12thhouse()');
    expect(rpcMigration).toContain("album_content_type <> 'music'");
    expect(rpcMigration).toContain('cardinality(p_track_ids) = 0');
    expect(rpcMigration).toContain('array_position(p_track_ids, NULL::uuid)');
    expect(rpcMigration).toContain('HAVING count(*) > 1');
    expect(rpcMigration).toContain('expected_count <> requested_count OR matched_count <> requested_count');
  });

  it('locks the album parent before reading the track set and documents the single update path', () => {
    expect(rpcMigration).toContain('FROM public.albums AS a');
    expect(rpcMigration).toContain('FOR UPDATE');
    expect(rpcMigration.indexOf('FOR UPDATE')).toBeLessThan(rpcMigration.indexOf('FROM public.tracks AS t'));
  });

  it('performs one complete update and returns the updated count', () => {
    expect(rpcMigration).toContain('WITH requested AS');
    expect(rpcMigration).toContain('WITH ORDINALITY');
    expect(rpcMigration).toContain('GET DIAGNOSTICS updated_count = ROW_COUNT');
    expect(rpcMigration).toContain('updated_count <> requested_count');
    expect(rpcMigration).toContain('RETURN updated_count');
  });

  it('repairs only the six audited rows and is guarded by their exact old values', () => {
    expect(repairMigration).toContain("'11111111-1111-4111-8111-111111111111'::uuid");
    expect(repairMigration).toContain("target_titles text[] := ARRAY['Track 01', 'Track 02', 'Track 03', 'Track 04', 'Track 05', 'Track 06']");
    expect(repairMigration).toContain('old_orders integer[] := ARRAY[-1, -2, -3, -4, -5, -6]');
    expect(repairMigration).toContain('new_orders integer[] := ARRAY[1, 2, 3, 4, 5, 6]');
    expect(repairMigration).toContain('FOR UPDATE');
    expect(repairMigration).toContain('IF all_new THEN');
    expect(repairMigration).toContain('IF NOT all_old THEN');
    expect(repairMigration).toContain('Repair state is partial or unexpected');
    expect(repairMigration).toContain('updated_count <> 6');
    expect(repairMigration).toContain('699f10ba-7a76-468f-9bcd-e36ba8d5ab11');
    expect(repairMigration).toContain('611db515-619a-4d06-9353-c6a80710e3ff');
  });
});

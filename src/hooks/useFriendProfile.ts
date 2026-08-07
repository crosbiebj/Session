import { useQuery } from '@tanstack/react-query';

import { getCatchPhotoSignedUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// Supabase-js infers a many-to-one embed (e.g. lakes(name) off catches)
// as an array without generated FK types, which this project deliberately
// doesn't set up (hand-written types elsewhere) — these are the actual
// single-object shapes Postgrest returns at runtime, cast explicitly
// below rather than fighting the inferred type.
type FriendCatch = {
  id: string;
  occurred_at: string;
  weight_grams: number | null;
  sub_type: string | null;
  lakes: { name: string } | null;
  catch_photos: { storage_path_display: string; position: number }[];
};
type FriendSpot = { id: string; name: string | null; lakes: { name: string } | null; swims: { name: string } | null };
type FriendTarget = {
  id: string;
  name: string | null;
  target_sub_type: string | null;
  achieved_at: string | null;
  lakes: { name: string } | null;
};
type FriendLake = { id: string; name: string };

// Every query below is scoped by owner_id/created_by = friendId with no
// extra filtering in app code — the existing RLS (can_view_catch,
// can_view_spot, can_view_lake, is_friends_with) already decides what a
// friend's row is visible to the viewer, so this screen only ever shows
// what's legitimately shared, the same as anywhere else in the app.
export function useFriendProfile(friendId: string | undefined) {
  return useQuery({
    queryKey: ['friend-profile', friendId],
    queryFn: async () => {
      const [userRes, catchesRes, spotsRes, targetsRes, lakesRes] = await Promise.all([
        supabase.from('users').select('id, display_name').eq('id', friendId as string).single(),
        supabase
          .from('catches')
          .select('id, occurred_at, weight_grams, sub_type, lakes(name), catch_photos(storage_path_display, position)')
          .eq('owner_id', friendId as string)
          .order('occurred_at', { ascending: false })
          .limit(5),
        supabase
          .from('spots')
          .select('id, name, lakes(name), swims(name)')
          .eq('created_by', friendId as string)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('targets')
          .select('id, name, target_sub_type, achieved_at, lakes(name)')
          .eq('owner_id', friendId as string)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('lakes')
          .select('id, name')
          .eq('owner_id', friendId as string)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (userRes.error) throw userRes.error;
      if (catchesRes.error) throw catchesRes.error;
      if (spotsRes.error) throw spotsRes.error;
      if (targetsRes.error) throw targetsRes.error;
      if (lakesRes.error) throw lakesRes.error;

      const friendCatches = (catchesRes.data ?? []) as unknown as FriendCatch[];
      const coverPaths = friendCatches
        .map((c) => c.catch_photos.find((p) => p.position === 0)?.storage_path_display)
        .filter((p): p is string => !!p);
      const signedUrls = await getCatchPhotoSignedUrls(coverPaths);

      const catches = friendCatches.map((c) => {
        const coverPath = c.catch_photos.find((p) => p.position === 0)?.storage_path_display;
        return { ...c, coverUrl: coverPath ? (signedUrls[coverPath] ?? null) : null };
      });

      return {
        user: userRes.data,
        catches,
        spots: (spotsRes.data ?? []) as unknown as FriendSpot[],
        targets: (targetsRes.data ?? []) as unknown as FriendTarget[],
        lakes: (lakesRes.data ?? []) as unknown as FriendLake[],
      };
    },
    enabled: !!friendId,
  });
}

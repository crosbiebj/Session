import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getCatchPhotoSignedUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { CatchWithPhotos, FishSubType } from '@/types/database';

const PAGE_SIZE = 20;

export type CatchListItem = CatchWithPhotos & {
  catch_photos: (CatchWithPhotos['catch_photos'][number] & { signedUrl: string | null })[];
};

export type CatchFilters = {
  // Matches against story/swim_peg — the closest thing to "search by fish
  // name" until catches can link to a named known_fish record.
  searchText?: string;
  lakeId?: string;
  subType?: FishSubType;
};

// Cursor-paginated on occurred_at (Section 3, "The Book... cursor-based
// pagination from day one"), matching idx_catches_owner_feed. Simplified
// to a single-column cursor rather than the full (occurred_at, id)
// compound key the index supports — fine at personal-catch-log scale,
// where two catches sharing the exact same timestamp is vanishingly rare.
//
// Filters are applied server-side, not just to whatever page happens to
// already be loaded — otherwise searching for an old catch would miss
// anything on a page that hasn't been fetched yet, which defeats the
// point of "find it without scrolling for 20 minutes."
export function useCatches(filters: CatchFilters = {}) {
  const { searchText, lakeId, subType } = filters;

  return useInfiniteQuery({
    queryKey: ['catches', { searchText, lakeId, subType }],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      let query = supabase
        .from('catches')
        .select('*, catch_photos(*), lakes(id, name)')
        .order('occurred_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt('occurred_at', pageParam);
      }
      if (searchText?.trim()) {
        // Comma and parentheses are syntactically significant in
        // PostgREST's .or() filter DSL — left unescaped, typing either
        // into the search box would malform the query (or, worse, let
        // typed input reshape the filter logic rather than just being
        // matched against as plain text).
        const sanitized = searchText.trim().replace(/[(),]/g, ' ');
        const term = `%${sanitized}%`;
        query = query.or(`story.ilike.${term},swim_peg.ilike.${term}`);
      }
      if (lakeId) {
        query = query.eq('lake_id', lakeId);
      }
      if (subType) {
        query = query.eq('sub_type', subType);
      }

      const { data, error } = await query;
      if (error) throw error;
      const catches = data as CatchWithPhotos[];

      const allPaths = catches.flatMap((c) => c.catch_photos.map((p) => p.storage_path_display));
      const signedUrls = await getCatchPhotoSignedUrls(allPaths);

      return catches.map((c) => ({
        ...c,
        catch_photos: c.catch_photos.map((p) => ({
          ...p,
          signedUrl: signedUrls[p.storage_path_display] ?? null,
        })),
      })) as CatchListItem[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1].occurred_at : undefined,
  });
}

// Cover photos from the angler's own catches, for the target reference-
// photo picker — deliberately scoped to catches you own, not "anything
// you have access to" (see the migration for why: no cross-angler photo
// use without a clearer consent story via a real ToS).
export function useMyCatchPhotos(limit = 30) {
  return useQuery({
    queryKey: ['catches', 'my-photos', limit],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('catch_photos')
        .select('id, catch_id, storage_path_display, catches!inner(owner_id)')
        .eq('catches.owner_id', userData.user.id)
        .eq('position', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const paths = (data ?? []).map((p) => p.storage_path_display);
      const signedUrls = await getCatchPhotoSignedUrls(paths);

      return (data ?? []).map((p) => ({
        id: p.id as string,
        catchId: p.catch_id as string,
        signedUrl: signedUrls[p.storage_path_display] ?? null,
      }));
    },
  });
}

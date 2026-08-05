import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Spot, SpotWithLake } from '@/types/database';

// lakeId scopes to one lake's own spots (Lake detail page's "unassigned
// spots" section); swimId scopes to one swim's saved spots (Swim detail
// page — "next time I am on that lake, I can go to the same swim and see
// all my spots there"); both omitted is every spot the angler can see,
// newest first, across all lakes (Spots page). RLS (can_view_spot) does
// the access scoping regardless of filter.
export function useSpots(filters?: { lakeId?: string; swimId?: string }) {
  return useQuery({
    queryKey: ['spots', filters?.lakeId ?? 'all', filters?.swimId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('spots')
        .select('*, lakes(id, name), swims(id, name)')
        .order('created_at', { ascending: false });

      if (filters?.lakeId) {
        query = query.eq('lake_id', filters.lakeId);
      }
      if (filters?.swimId) {
        query = query.eq('swim_id', filters.swimId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SpotWithLake[];
    },
  });
}

type CreateSpotInput = {
  lakeId: string;
  swimId: string | null;
  name: string | null;
  farBankMarker: string | null;
  bearingDegrees: number | null;
  rodLengthFt: number | null;
  distanceWraps: number | null;
  distanceEstimateM: number | null;
  depthM: number | null;
  bottomType: string | null;
  notes: string | null;
  visibility: 'private' | 'group';
};

export function useCreateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpotInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('spots')
        .insert({
          lake_id: input.lakeId,
          swim_id: input.swimId,
          created_by: userData.user.id,
          name: input.name,
          far_bank_marker: input.farBankMarker,
          bearing_degrees: input.bearingDegrees,
          rod_length_ft: input.rodLengthFt,
          distance_wraps: input.distanceWraps,
          distance_estimate_m: input.distanceEstimateM,
          depth_m: input.depthM,
          bottom_type: input.bottomType,
          notes: input.notes,
          visibility: input.visibility,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Spot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Spot, SpotWithLake } from '@/types/database';

// lakeId scopes to one lake's own spots (Lake detail page's "unassigned
// spots" section); swimId scopes to one swim's saved spots (Swim detail
// page — "next time I am on that lake, I can go to the same swim and see
// all my spots there"); both omitted is every spot the angler can see,
// newest first, across all lakes (Spots page). RLS (can_view_spot) does
// the access scoping regardless of filter.
export function useSpots(filters?: { lakeId?: string; swimId?: string; groupId?: string }) {
  return useQuery({
    queryKey: ['spots', filters?.lakeId ?? 'all', filters?.swimId ?? 'all', filters?.groupId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('spots')
        .select('*, lakes(id, name), swims(id, name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.lakeId) {
        query = query.eq('lake_id', filters.lakeId);
      }
      if (filters?.swimId) {
        query = query.eq('swim_id', filters.swimId);
      }
      if (filters?.groupId) {
        // No !inner join filtering on a to-many embed via PostgREST dot
        // notation here — simplest is resolving the group's own lake ids
        // first, same two-step shape the group hub screen would otherwise
        // have to do itself.
        const { data: groupLakes, error: lakesError } = await supabase
          .from('lakes')
          .select('id')
          .eq('group_id', filters.groupId);
        if (lakesError) throw lakesError;
        const lakeIds = (groupLakes ?? []).map((l) => l.id);
        if (lakeIds.length === 0) return [] as SpotWithLake[];
        query = query.in('lake_id', lakeIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SpotWithLake[];
    },
  });
}

export function useSpot(id: string | undefined) {
  return useQuery({
    queryKey: ['spots', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spots')
        .select('*, lakes(id, name), swims(id, name)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data as SpotWithLake;
    },
    enabled: !!id,
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

type UpdateSpotInput = Omit<CreateSpotInput, 'lakeId'> & { id: string };

export function useUpdateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSpotInput) => {
      const { error } = await supabase
        .from('spots')
        .update({
          swim_id: input.swimId,
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
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] });
    },
  });
}

export function useDeleteSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spots')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useTrashedSpots() {
  return useQuery({
    queryKey: ['trash', 'spots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spots')
        .select('*, lakes(id, name), swims(id, name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as SpotWithLake[];
    },
  });
}

export function useRestoreSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spots').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

// Direct spot sharing (Section 3, Sharing model tier 3) — distinct from
// visibility='group', which is always tied to the lake's own group. This
// targets one specific friend regardless of which lake/group the spot
// belongs to.
export function useShareSpotWithFriend() {
  return useMutation({
    mutationFn: async (input: { spotId: string; friendUserId: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { error } = await supabase.from('shared_items').insert({
        owner_id: userData.user.id,
        spot_id: input.spotId,
        shared_with_user_id: input.friendUserId,
      });

      if (error) throw error;
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Lake } from '@/types/database';

// No explicit owner_id filter — RLS already scopes this to lakes the
// current user can see (their own, plus any group lakes they're a member
// of). deleted_at filter keeps soft-deleted lakes out of normal listing
// — the restrictive RLS policy still lets the owner see their own for
// the trash screen, so this app-level filter is what actually hides it
// from the everyday list.
export function useLakes(filters?: { groupId?: string }) {
  return useQuery({
    queryKey: ['lakes', filters?.groupId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('lakes').select('*').is('deleted_at', null).order('name');
      if (filters?.groupId) {
        query = query.eq('group_id', filters.groupId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Lake[];
    },
  });
}

export function useLake(id: string) {
  return useQuery({
    queryKey: ['lakes', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('lakes').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Lake;
    },
    enabled: !!id,
  });
}

export function useUpdateLake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      latitude?: number | null;
      longitude?: number | null;
      groupId?: string | null;
    }) => {
      const { error } = await supabase
        .from('lakes')
        .update({
          name: input.name,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          ...(input.groupId !== undefined ? { group_id: input.groupId } : {}),
        })
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lakes'] });
      queryClient.invalidateQueries({ queryKey: ['lakes', variables.id] });
    },
  });
}

export function useDeleteLake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lakes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lakes'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useTrashedLakes() {
  return useQuery({
    queryKey: ['trash', 'lakes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lakes')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as Lake[];
    },
  });
}

export function useRestoreLake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lakes').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lakes'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useCreateLake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      latitude?: number;
      longitude?: number;
      groupId?: string | null;
    }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('lakes')
        .insert({
          owner_id: userData.user.id,
          name: input.name,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          group_id: input.groupId ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Lake;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lakes'] });
    },
  });
}

// Direct lake sharing (Section 3, Sharing model tier 3) — mirrors
// useShareSpotWithFriend exactly.
export function useShareLakeWithFriend() {
  return useMutation({
    mutationFn: async (input: { lakeId: string; friendUserId: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { error } = await supabase.from('shared_items').insert({
        owner_id: userData.user.id,
        lake_id: input.lakeId,
        shared_with_user_id: input.friendUserId,
      });

      if (error) throw error;
    },
  });
}

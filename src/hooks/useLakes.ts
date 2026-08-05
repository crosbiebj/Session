import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Lake } from '@/types/database';

// No explicit owner_id filter — RLS already scopes this to lakes the
// current user can see (their own, plus any group lakes they're a member
// of).
export function useLakes() {
  return useQuery({
    queryKey: ['lakes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lakes').select('*').order('name');
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

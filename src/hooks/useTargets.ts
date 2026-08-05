import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FishSubType } from '@/types/database';

export function useTargets() {
  return useQuery({
    queryKey: ['targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('targets')
        .select('*, lakes(name), known_fish(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      lakeId: string | null;
      targetSubType: FishSubType | null;
      notes: string | null;
    }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('targets')
        .insert({
          owner_id: userData.user.id,
          lake_id: input.lakeId,
          target_sub_type: input.targetSubType,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
}

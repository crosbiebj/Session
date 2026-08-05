import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Lake, Swim } from '@/types/database';

// Swims are lake-scoped and manually maintained — naming schemes vary
// lake to lake (e.g. Arrow Pit's "Mollie Moo's"), so there's no fixed
// list, just whatever the angler (or their group) has added for that lake.
export function useSwims(lakeId: string | null | undefined) {
  return useQuery({
    queryKey: ['swims', lakeId ?? 'none'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('swims')
        .select('*')
        .eq('lake_id', lakeId as string)
        .order('name');
      if (error) throw error;
      return data as Swim[];
    },
    enabled: !!lakeId,
  });
}

export function useSwim(id: string | undefined) {
  return useQuery({
    queryKey: ['swims', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('swims')
        .select('*, lakes(id, name)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data as Swim & { lakes: Pick<Lake, 'id' | 'name'> | null };
    },
    enabled: !!id,
  });
}

export function useCreateSwim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { lakeId: string; name: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('swims')
        .insert({ lake_id: input.lakeId, name: input.name, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Swim;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['swims', variables.lakeId] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(name)')
        .order('planned_start', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { lakeId: string; plannedStart: Date; plannedEnd: Date; notes: string | null }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          owner_id: userData.user.id,
          lake_id: input.lakeId,
          planned_start: input.plannedStart.toISOString(),
          planned_end: input.plannedEnd.toISOString(),
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

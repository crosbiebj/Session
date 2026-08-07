import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(name)')
        .is('deleted_at', null)
        .order('planned_start', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Own sessions plus anything a group I'm in has been let see (Phase 2's
// group calendar, pulled forward — sessions_select_group_visible RLS
// does the actual scoping). owner(display_name) lets the Home widget
// label/colour-code whose session each one is.
export function useUpcomingSessions(limit = 5) {
  return useQuery({
    queryKey: ['sessions', 'upcoming', limit],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(name), owner:owner_id(id, display_name)')
        .is('deleted_at', null)
        .gte('planned_end', new Date().toISOString())
        .order('planned_start', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return { sessions: data, myId: userData.user?.id ?? null };
    },
  });
}

// The group-scoped counterpart to useUpcomingSessions — Ben: "I want to
// book my sessions and see who is going to come with me." Booking already
// existed (the "Visible to" picker on the create form); this is the
// missing aggregated view showing everyone's shared sessions together,
// not just your own plus a stray mention elsewhere.
export function useGroupSessions(groupId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', 'group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(name), owner:owner_id(id, display_name)')
        .eq('visible_to_group_id', groupId as string)
        .is('deleted_at', null)
        .gte('planned_end', new Date().toISOString())
        .order('planned_start', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(id, name)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      plannedStart: Date;
      plannedEnd: Date;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from('sessions')
        .update({
          planned_start: input.plannedStart.toISOString(),
          planned_end: input.plannedEnd.toISOString(),
          notes: input.notes,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useTrashedSessions() {
  return useQuery({
    queryKey: ['trash', 'sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, lakes(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRestoreSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      lakeId: string;
      plannedStart: Date;
      plannedEnd: Date;
      notes: string | null;
      visibleToGroupId?: string | null;
    }) => {
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
          visible_to_group_id: input.visibleToGroupId ?? null,
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

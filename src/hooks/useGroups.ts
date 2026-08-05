import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, member:user_id(id, display_name)')
        .eq('group_id', groupId as string)
        .order('joined_at');
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: input.groupId, user_id: input.userId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      // The handle_new_group trigger auto-adds the creator as owner —
      // see supabase/migrations/20260803150000_phase1_rls_policies.sql.
      const { data, error } = await supabase
        .from('groups')
        .insert({ name, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAvatarSignedUrl, uploadAvatar } from '@/lib/storage';
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
      const avatarSignedUrl = await getAvatarSignedUrl(data.avatar_url);
      return { ...data, avatarSignedUrl };
    },
    enabled: !!id,
  });
}

// Owner-only, enforced by the avatars_storage_insert/update RLS policy —
// see supabase/migrations/20260807120000_avatars_storage.sql. Ben: "we
// have our own group icon... we'd like to have that at the top of the
// group page as a banner."
export function useUpdateGroupAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { groupId: string; base64: string; fileExtension: string }) => {
      const path = await uploadAvatar({
        scope: 'group',
        id: input.groupId,
        base64: input.base64,
        fileExtension: input.fileExtension,
      });

      const { error } = await supabase.from('groups').update({ avatar_url: path }).eq('id', input.groupId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
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

      // created_by and invite_code are both stamped server-side by the
      // stamp_created_by trigger (supabase/migrations/20260806100000_
      // stamp_group_created_by.sql, extended in 20260806150000_
      // group_invite_links.sql) — not sent from the client. The
      // handle_new_group trigger then auto-adds the creator as owner —
      // see supabase/migrations/20260803150000_phase1_rls_policies.sql.
      const { data, error } = await supabase.from('groups').insert({ name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// The "otherwise" path (Ben: "auto join if invited, but otherwise -
// invited party has to approve") — entering a code you weren't personally
// handed a friends-list invite for creates a pending request rather than
// joining outright, since a code can travel further than the owner meant.
export function useRequestToJoinGroupByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data: foundRaw, error: lookupError } = await supabase
        .rpc('find_group_by_invite_code', { p_code: code.trim() })
        .single();
      if (lookupError || !foundRaw) throw new Error('No group found with that code.');
      const found = foundRaw as { id: string; name: string };

      const { error } = await supabase
        .from('group_join_requests')
        .insert({ group_id: found.id, user_id: userData.user.id });
      if (error) {
        if (error.code === '23505') throw new Error("You've already requested to join this group.");
        throw error;
      }
      return found;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function usePendingJoinRequests(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'join-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('*, requester:user_id(id, display_name)')
        .eq('group_id', groupId as string)
        .eq('status', 'pending')
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { requestId: string; groupId: string }) => {
      const { error } = await supabase.rpc('approve_group_join_request', {
        p_request_id: input.requestId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDeclineJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { requestId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', input.requestId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'join-requests'] });
    },
  });
}

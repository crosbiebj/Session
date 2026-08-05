import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// Accepted friendships only, resolved to "the other person" regardless of
// who sent the original request.
export function useFriends() {
  return useQuery({
    queryKey: ['friendships'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');
      const myId = userData.user.id;

      const { data, error } = await supabase
        .from('friendships')
        .select('*, requester:requester_id(id, display_name), addressee:addressee_id(id, display_name)')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

      if (error) throw error;

      return (data ?? []).map((f) => ({
        id: f.id,
        friend: f.requester_id === myId ? f.addressee : f.requester,
      }));
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('friendships')
        .insert({ requester_id: userData.user.id, addressee_id: addresseeId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}

// Requests you've received and haven't responded to yet.
export function useIncomingFriendRequests() {
  return useQuery({
    queryKey: ['friendships', 'incoming'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('friendships')
        .select('*, requester:requester_id(id, display_name)')
        .eq('status', 'pending')
        .eq('addressee_id', userData.user.id);

      if (error) throw error;
      return data;
    },
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { friendshipId: string; accept: boolean }) => {
      if (input.accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', input.friendshipId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('friendships').delete().eq('id', input.friendshipId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}

// Users are only readable via RLS once you're already friends/groupmates —
// find_user_id_by_invite_code (Section 3, Sharing model) is the one narrow
// crack in that wall, resolving just an id from a code someone shared with
// you, so there's someone to send the request to.
export function useSendFriendRequestByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data: foundId, error: lookupError } = await supabase.rpc('find_user_id_by_invite_code', {
        p_code: code.trim(),
      });
      if (lookupError) throw lookupError;
      if (!foundId) throw new Error('No angler found with that code.');
      if (foundId === userData.user.id) throw new Error("That's your own code.");

      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: userData.user.id, addressee_id: foundId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}

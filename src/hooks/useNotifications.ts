import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'group_join_request'
  | 'group_join_approved';

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: { requester_id?: string; friend_id?: string; group_id?: string } | null;
  read_at: string | null;
  created_at: string;
};

// Every row is written server-side by a trigger (see
// supabase/migrations/20260807110000_notifications.sql) on the events
// that already happen silently today — a friend request, an accept, a
// group join request, an approval. In-app only for v1, not push; the
// list is refetched on mount/focus rather than realtime-pushed.
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as NotificationRow[];
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userData.user.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

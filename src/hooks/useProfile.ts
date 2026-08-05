import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// The current user's own public.users row — invite_code lives here (see
// Section 3, Sharing model: how a friend request actually finds someone).
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, invite_code')
        .eq('id', userData.user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

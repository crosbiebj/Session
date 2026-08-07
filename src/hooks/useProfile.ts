import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAvatarSignedUrl, uploadAvatar } from '@/lib/storage';
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
        .select('id, display_name, invite_code, avatar_url')
        .eq('id', userData.user.id)
        .single();

      if (error) throw error;
      const avatarSignedUrl = await getAvatarSignedUrl(data.avatar_url);
      return { ...data, avatarSignedUrl };
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: { base64: string; fileExtension: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const path = await uploadAvatar({
        scope: 'user',
        id: userData.user.id,
        base64: photo.base64,
        fileExtension: photo.fileExtension,
      });

      const { error } = await supabase.from('users').update({ avatar_url: path }).eq('id', userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Uniqueness (case-insensitive) and the basic content filter are both
// enforced server-side too (enforce_display_name_policy trigger,
// supabase/migrations/20260807100000_profile_targets_blocking.sql) — this
// just surfaces whatever it rejects as a normal form error rather than a
// raw Postgres exception.
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { error } = await supabase
        .from('users')
        .update({ display_name: displayName.trim() || null })
        .eq('id', userData.user.id);

      if (error) {
        if (error.code === '23505') throw new Error('That nickname is already taken.');
        if (error.message.includes('24 characters')) throw new Error('Nickname must be 24 characters or fewer.');
        if (error.message.includes('isn\'t allowed')) throw new Error("That nickname isn't allowed.");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

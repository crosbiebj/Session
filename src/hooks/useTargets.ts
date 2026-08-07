import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCatchPhotoSignedUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { FishSubType } from '@/types/database';

export function useTargets(filters?: { lakeId?: string }) {
  return useQuery({
    queryKey: ['targets', filters?.lakeId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('targets')
        .select('*, lakes(name), known_fish(name), reference_photo:reference_photo_id(id, storage_path_display)')
        .order('created_at', { ascending: false });

      if (filters?.lakeId) {
        query = query.eq('lake_id', filters.lakeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const paths = (data ?? [])
        .map((t) => t.reference_photo?.storage_path_display)
        .filter((p): p is string => !!p);
      const signedUrls = await getCatchPhotoSignedUrls(paths);

      return (data ?? []).map((t) => ({
        ...t,
        referencePhotoUrl: t.reference_photo?.storage_path_display
          ? (signedUrls[t.reference_photo.storage_path_display] ?? null)
          : null,
      }));
    },
  });
}

export function useCreateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      lakeId: string | null;
      targetSubType: FishSubType | null;
      notes: string | null;
      referencePhotoId?: string | null;
    }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('targets')
        .insert({
          owner_id: userData.user.id,
          name: input.name,
          lake_id: input.lakeId,
          target_sub_type: input.targetSubType,
          notes: input.notes,
          reference_photo_id: input.referencePhotoId ?? null,
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

export function useSetTargetAchieved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; achieved: boolean }) => {
      const { error } = await supabase
        .from('targets')
        .update({ achieved_at: input.achieved ? new Date().toISOString() : null })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadCatchPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { Catch } from '@/types/database';
import { fetchHistoricalWeather } from '@/lib/weather';

type CreateCatchInput = {
  occurredAt: Date;
  weightGrams: number | null;
  lakeId: string | null;
  // Passed through from the selected lake rather than re-queried here —
  // the caller already has it from LakePicker's selection.
  lakeLatitude?: number | null;
  lakeLongitude?: number | null;
  photos: { base64: string; fileExtension: string }[];
};

export function useCreateCatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCatchInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');
      const ownerId = userData.user.id;

      const { data: catchRow, error: catchError } = await supabase
        .from('catches')
        .insert({
          owner_id: ownerId,
          lake_id: input.lakeId,
          occurred_at: input.occurredAt.toISOString(),
          weight_grams: input.weightGrams,
        })
        .select()
        .single();

      if (catchError) throw catchError;
      const catchId = (catchRow as Catch).id;

      try {
        for (let i = 0; i < input.photos.length; i++) {
          const photo = input.photos[i];
          const path = await uploadCatchPhoto({
            ownerId,
            catchId,
            base64: photo.base64,
            fileExtension: photo.fileExtension,
          });

          const { error: photoError } = await supabase.from('catch_photos').insert({
            catch_id: catchId,
            storage_path_original: path,
            storage_path_display: path,
            position: i,
          });

          if (photoError) throw photoError;
        }
      } catch (err) {
        // Compensating rollback — a catch without its required photo(s)
        // shouldn't linger. The catch delete cascades any catch_photos
        // rows that did get created; any already-uploaded Storage files
        // from earlier iterations in this loop are left orphaned rather
        // than cleaned up here — harmless (just unused storage), and not
        // worth the extra complexity for what should be a rare failure.
        await supabase.from('catches').delete().eq('id', catchId);
        throw err;
      }

      // Weather & moon phase auto-fetch (CLAUDE.md §3) — only possible
      // when the selected lake has saved coordinates. Deliberately NOT
      // awaited: "Save Catch" shouldn't sit spinning on a third-party
      // API's response time for something that's a background nicety, not
      // a required field. Fires after the mutation resolves and updates
      // the cache again once (if) it lands.
      if (input.lakeLatitude != null && input.lakeLongitude != null) {
        fetchHistoricalWeather(input.lakeLatitude, input.lakeLongitude, input.occurredAt)
          .then((weather) => {
            if (!weather) return null;
            return supabase
              .from('catches')
              .update({
                air_temp_c: weather.tempC,
                air_pressure_hpa: weather.pressureHpa,
                wind_speed: weather.windSpeedKmh,
                wind_direction: weather.windDirectionDeg,
              })
              .eq('id', catchId);
          })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['catches'] });
          })
          .catch(() => {
            // Weather is a nicety, not a requirement — silently give up.
          });
      }

      return catchRow as Catch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
    },
  });
}

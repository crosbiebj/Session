import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// A proper front door for pattern insights (CLAUDE.md §3, Stats) rather
// than only living inside the dock's accordion — three cheap count/sum
// queries in parallel, not the full paginated catch list.
export function useHomeStats() {
  return useQuery({
    queryKey: ['stats', 'home'],
    queryFn: async () => {
      const [catchesRes, sessionsRes, weightRes] = await Promise.all([
        supabase.from('catches').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('catches').select('weight_grams'),
      ]);

      if (catchesRes.error) throw catchesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (weightRes.error) throw weightRes.error;

      const totalWeightGrams = (weightRes.data ?? []).reduce(
        (sum, row) => sum + (row.weight_grams ?? 0),
        0,
      );

      return {
        catchCount: catchesRes.count ?? 0,
        sessionCount: sessionsRes.count ?? 0,
        totalWeightGrams,
      };
    },
  });
}

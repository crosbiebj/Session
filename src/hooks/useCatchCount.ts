import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// Lightweight count-only query — Home's "X catches logged" line doesn't
// need the full paginated catch data useCatches loads.
export function useCatchCount() {
  return useQuery({
    queryKey: ['catches', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('catches')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { useHomeStats } from '@/hooks/useHomeStats';
import { formatWeightLbOz } from '@/lib/units';

// Right-hand Home widget — a proper front door for pattern insights
// (CLAUDE.md §3, Stats) rather than only living inside the dock row.
export function StatsWidget() {
  const { data, isLoading } = useHomeStats();

  return (
    <Pressable
      onPress={() => router.push('/stats')}
      scaleTo={0.98}
      className="flex-1 rounded-2xl bg-dock-panel p-4"
    >
      <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
        At a glance
      </Text>

      {isLoading ? null : (
        <View className="mt-3 gap-2.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans text-sm text-dock-text-dim">Catches</Text>
            <Text className="font-sans-medium text-base text-dock-text">{data?.catchCount ?? 0}</Text>
          </View>
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans text-sm text-dock-text-dim">Sessions</Text>
            <Text className="font-sans-medium text-base text-dock-text">{data?.sessionCount ?? 0}</Text>
          </View>
          <View className="flex-row items-baseline justify-between">
            <Text className="font-sans text-sm text-dock-text-dim">Total weight</Text>
            <Text className="font-sans-medium text-base text-dock-amber">
              {data && data.totalWeightGrams > 0 ? formatWeightLbOz(data.totalWeightGrams) : '—'}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

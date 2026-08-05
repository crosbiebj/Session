import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCatchCount } from '@/hooks/useCatchCount';
import { useSessions } from '@/hooks/useSessions';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 rounded-xl bg-dock-panel px-4 py-4">
      <Text className="font-serif text-3xl text-dock-amber">{value}</Text>
      <Text className="mt-1 font-label text-xs uppercase tracking-wide text-dock-text-faint">
        {label}
      </Text>
    </View>
  );
}

// Personal-only pattern insights (CLAUDE.md §3). Full pattern insights
// (best baits/lakes, weight over time) are a later pass — this is the
// honest, currently-available subset: what we can compute directly from
// catches/sessions today.
export default function Stats() {
  const catchCount = useCatchCount();
  const sessions = useSessions();

  const totalHours = (sessions.data ?? []).reduce((sum, s) => {
    const hours = (new Date(s.planned_end).getTime() - new Date(s.planned_start).getTime()) / 3_600_000;
    return sum + hours;
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
        </Pressable>
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
          Stats
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {catchCount.isLoading || sessions.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <View className="gap-3 p-5">
          <View className="flex-row gap-3">
            <StatTile label="Catches logged" value={catchCount.data ?? 0} />
            <StatTile label="Trip-outs" value={sessions.data?.length ?? 0} />
          </View>
          <View className="flex-row gap-3">
            <StatTile label="Hours on the bank" value={Math.round(totalHours)} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

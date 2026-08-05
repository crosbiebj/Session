import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useLake } from '@/hooks/useLakes';
import { useSpots } from '@/hooks/useSpots';
import { useCreateSwim, useSwims } from '@/hooks/useSwims';

// "When I go to lakes, I should see my saved spots for that lake" — but
// since each lake names its swims differently (Arrow Pit's "Mollie
// Moo's" means nothing anywhere else), the drill-down goes lake > swim >
// that swim's spots, not a flat spot list. Spots logged without a swim
// still show here so nothing saved gets orphaned by the hierarchy.
export default function LakeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lake, isLoading: lakeLoading } = useLake(id);
  const { data: swims, isLoading: swimsLoading } = useSwims(id);
  const { data: spots } = useSpots({ lakeId: id });
  const createSwim = useCreateSwim();
  const [newSwimName, setNewSwimName] = useState('');

  const unassignedSpots = (spots ?? []).filter((s) => !s.swim_id);

  const handleAddSwim = async () => {
    if (!id || !newSwimName.trim()) return;
    await createSwim.mutateAsync({ lakeId: id, name: newSwimName.trim() });
    setNewSwimName('');
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-dock-border px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
        </Pressable>
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text" numberOfLines={1}>
          {lake?.name ?? 'Lake'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {lakeLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={swims ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-4 gap-1">
              {lake?.group_id ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="people" size={12} color="#5C7A4C" />
                  <Text className="font-sans text-xs text-dock-moss">Shared with group</Text>
                </View>
              ) : null}
              {lake?.latitude !== null && lake !== undefined ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="location" size={12} color="#5C7A4C" />
                  <Text className="font-sans text-xs text-dock-text-faint">
                    Location pinned — weather auto-fills for catches here
                  </Text>
                </View>
              ) : null}
              <Text className="mt-3 font-label text-xs uppercase tracking-widest text-dock-text-faint">
                Swims
              </Text>
            </View>
          }
          ListEmptyComponent={
            !swimsLoading ? (
              <Text className="font-sans text-sm text-dock-text-faint">
                No swims added yet — every lake names them differently, so add the ones you fish
                below.
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}>
              <Pressable
                onPress={() => router.push(`/swims/${item.id}`)}
                className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
              >
                <Text className="font-sans-medium text-base text-dock-text">{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#5C6154" />
              </Pressable>
            </Animated.View>
          )}
          ListFooterComponent={
            <View className="gap-3">
              {unassignedSpots.length > 0 ? (
                <View className="mt-4 gap-2">
                  <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                    Spots not tied to a swim
                  </Text>
                  {unassignedSpots.map((s) => (
                    <View key={s.id} className="rounded-xl bg-dock-panel px-4 py-3">
                      <Text className="font-sans-medium text-base text-dock-text">
                        {s.name ?? 'Spot'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="mt-4 flex-row gap-2">
                <TextInput
                  value={newSwimName}
                  onChangeText={setNewSwimName}
                  placeholder="Add a swim (e.g. Mollie Moo's)"
                  placeholderTextColor="#5C6154"
                  className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
                />
                <AnimatedPressable
                  onPress={handleAddSwim}
                  disabled={createSwim.isPending}
                  className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
                >
                  <Text className="font-sans-semibold text-base text-dock-text">Add</Text>
                </AnimatedPressable>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

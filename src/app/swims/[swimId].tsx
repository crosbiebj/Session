import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSpots } from '@/hooks/useSpots';
import { useSwim } from '@/hooks/useSwims';

// "When I click into a swim... I want to see all the spots I've saved in
// that specific swim so that next time I am on that lake, I can go to the
// same swim and see all my spots there."
export default function SwimDetail() {
  const { swimId } = useLocalSearchParams<{ swimId: string }>();
  const { data: swim, isLoading: swimLoading } = useSwim(swimId);
  const { data: spots, isLoading: spotsLoading } = useSpots({ swimId });

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
        <View className="items-center">
          <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text" numberOfLines={1}>
            {swim?.name ?? 'Swim'}
          </Text>
          {swim?.lakes?.name ? (
            <Text className="font-sans text-xs text-dock-text-faint">{swim.lakes.name}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/spots')}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="add" size={20} color="#EDEBE0" />
        </Pressable>
      </View>

      {swimLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={spots ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListEmptyComponent={
            !spotsLoading ? (
              <Text className="font-sans text-sm text-dock-text-faint">
                No spots saved in this swim yet.
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              className="rounded-xl bg-dock-panel px-4 py-3.5"
            >
              <Text className="font-sans-medium text-base text-dock-text">{item.name ?? 'Spot'}</Text>
              {item.far_bank_marker ? (
                <View className="mt-1 flex-row items-center gap-1">
                  <Ionicons name="navigate" size={11} color="#5C7A4C" />
                  <Text className="font-sans text-xs text-dock-text-dim">
                    Cast towards {item.far_bank_marker}
                  </Text>
                </View>
              ) : null}
              <View className="mt-1.5 flex-row flex-wrap gap-x-3 gap-y-0.5">
                {item.bearing_degrees !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.bearing_degrees}°</Text>
                ) : null}
                {item.distance_wraps !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">
                    {item.distance_wraps} wraps{item.rod_length_ft ? ` @ ${item.rod_length_ft}ft` : ''}
                  </Text>
                ) : null}
                {item.depth_m !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.depth_m}m deep</Text>
                ) : null}
                {item.bottom_type ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.bottom_type}</Text>
                ) : null}
              </View>
              {item.notes ? (
                <Text className="mt-1.5 font-sans text-sm text-dock-text-dim">{item.notes}</Text>
              ) : null}
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

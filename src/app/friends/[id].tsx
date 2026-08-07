import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useBlockUser, useRemoveFriend } from '@/hooks/useFriendships';
import { useFriendProfile } from '@/hooks/useFriendProfile';
import { formatWeightLbOz } from '@/lib/units';

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">{title}</Text>
      {empty ? (
        <Text className="font-sans text-sm text-dock-text-faint">Nothing shared here yet.</Text>
      ) : (
        <View className="gap-2">{children}</View>
      )}
    </View>
  );
}

// "We'd like to see their latest activity, spots, targets, lakes." Every
// row here comes back already scoped by RLS (can_view_catch/spot/lake,
// is_friends_with for targets) — see useFriendProfile — so this only ever
// shows what's genuinely shared with the viewer, not a friend's full
// private record.
export default function FriendProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useFriendProfile(id);
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();

  const name = data?.user?.display_name ?? 'Angler';

  const confirmRemove = () => {
    Alert.alert(`Remove ${name}?`, "You'll need a new invite code to reconnect.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFriend.mutateAsync(id);
          router.back();
        },
      },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert(
      `Block ${name}?`,
      "They won't be able to send you another friend request. This also removes them as a friend.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await blockUser.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-dock-border px-5 py-3">
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
        </AnimatedPressable>
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text" numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <Section title="Latest activity" empty={!data?.catches.length}>
            {data?.catches.map((c) => (
              <Animated.View
                key={c.id}
                entering={FadeInDown.duration(250)}
                className="flex-row items-center gap-3 rounded-xl bg-dock-panel px-4 py-3"
              >
                {c.coverUrl ? (
                  <Image source={{ uri: c.coverUrl }} className="h-11 w-11 rounded-lg" resizeMode="cover" />
                ) : (
                  <View className="h-11 w-11 items-center justify-center rounded-lg bg-white/5">
                    <Ionicons name="image-outline" size={16} color="#5C6154" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-sans-medium text-sm text-dock-text">
                    {c.weight_grams ? formatWeightLbOz(c.weight_grams) : 'Unweighed'}
                    {c.sub_type ? ` ${c.sub_type.replace('_', ' ')}` : ''}
                  </Text>
                  <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">
                    {c.lakes?.name ?? 'Lake TBC'} ·{' '}
                    {new Date(c.occurred_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </Section>

          <Section title="Spots" empty={!data?.spots.length}>
            {data?.spots.map((s) => (
              <View key={s.id} className="rounded-xl bg-dock-panel px-4 py-3">
                <Text className="font-sans-medium text-sm text-dock-text">
                  {s.name ?? s.swims?.name ?? 'Spot'}
                </Text>
                {s.lakes?.name ? (
                  <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">{s.lakes.name}</Text>
                ) : null}
              </View>
            ))}
          </Section>

          <Section title="Targets" empty={!data?.targets.length}>
            {data?.targets.map((t) => (
              <View key={t.id} className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3">
                <View className="flex-1">
                  <Text className="font-sans-medium text-sm text-dock-text">
                    {t.name ?? t.target_sub_type?.replace('_', ' ') ?? 'Target'}
                  </Text>
                  {t.lakes?.name ? (
                    <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">{t.lakes.name}</Text>
                  ) : null}
                </View>
                {t.achieved_at ? (
                  <Text className="font-label text-[10px] uppercase tracking-wide text-dock-amber">Achieved</Text>
                ) : null}
              </View>
            ))}
          </Section>

          <Section title="Lakes" empty={!data?.lakes.length}>
            {data?.lakes.map((l) => (
              <View key={l.id} className="rounded-xl bg-dock-panel px-4 py-3">
                <Text className="font-sans-medium text-sm text-dock-text">{l.name}</Text>
              </View>
            ))}
          </Section>

          <View className="mt-4 gap-2">
            <AnimatedPressable
              onPress={confirmRemove}
              className="items-center rounded-lg border border-dock-border py-3"
            >
              <Text className="font-sans-medium text-sm text-dock-text-dim">Remove friend</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={confirmBlock}
              className="items-center rounded-lg border border-red-500/30 py-3"
            >
              <Text className="font-sans-medium text-sm text-red-400">Block</Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

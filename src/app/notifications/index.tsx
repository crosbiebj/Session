import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationRow,
} from '@/hooks/useNotifications';

const ICONS: Record<NotificationRow['type'], keyof typeof Ionicons.glyphMap> = {
  friend_request: 'person-add',
  friend_request_accepted: 'checkmark-circle',
  group_join_request: 'people',
  group_join_approved: 'checkmark-circle',
};

function targetRoute(n: NotificationRow): string | null {
  switch (n.type) {
    case 'friend_request':
      return '/friends';
    case 'friend_request_accepted':
      return n.data?.friend_id ? `/friends/${n.data.friend_id}` : '/friends';
    case 'group_join_request':
    case 'group_join_approved':
      return n.data?.group_id ? `/groups/${n.data.group_id}` : '/groups';
    default:
      return null;
  }
}

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  const handlePress = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate(n.id);
    const route = targetRoute(n);
    if (route) router.push(route as never);
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
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
          Notifications
        </Text>
        <Pressable
          onPress={() => hasUnread && markAllRead.mutate()}
          hitSlop={8}
          disabled={!hasUnread}
          className="h-9 w-9 items-center justify-center"
        >
          {hasUnread ? <Ionicons name="checkmark-done" size={19} color="#8B9184" /> : <View style={{ width: 19 }} />}
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">Nothing here yet.</Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(250).delay(Math.min(index, 8) * 30)}>
              <Pressable
                onPress={() => handlePress(item)}
                className={`flex-row items-start gap-3 rounded-xl px-4 py-3.5 active:opacity-70 ${
                  item.read_at ? 'bg-dock-panel' : 'bg-dock-amber/10'
                }`}
              >
                <View
                  className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${
                    item.read_at ? 'bg-white/10' : 'bg-dock-amber/20'
                  }`}
                >
                  <Ionicons name={ICONS[item.type]} size={15} color={item.read_at ? '#8B9184' : '#C9974A'} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-medium text-sm text-dock-text">{item.title}</Text>
                  {item.body ? (
                    <Text className="mt-0.5 font-sans text-xs text-dock-text-dim">{item.body}</Text>
                  ) : null}
                  <Text className="mt-1 font-sans text-[10px] text-dock-text-faint">
                    {new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                {!item.read_at ? <View className="mt-1.5 h-2 w-2 rounded-full bg-dock-amber" /> : null}
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

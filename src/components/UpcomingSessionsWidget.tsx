import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/Pressable';
import { useUpcomingSessions } from '@/hooks/useSessions';
import { useAuthStore } from '@/stores/auth-store';

// Left-hand Home widget — "a calendar which will show you your next
// upcoming sessions and those of your groups/friends, colour coded."
// Group visibility is real (sessions_select_group_visible RLS), not just
// a filtered view of your own — someone else's shared session shows
// their name and a different accent so it reads as theirs at a glance.
export function UpcomingSessionsWidget() {
  const myId = useAuthStore((state) => state.session?.user.id);
  const { data, isLoading } = useUpcomingSessions(4);
  const sessions = data?.sessions ?? [];

  return (
    <Pressable
      onPress={() => router.push('/sessions')}
      scaleTo={0.98}
      className="flex-1 rounded-2xl bg-dock-panel p-4"
    >
      <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
        Upcoming
      </Text>

      {isLoading ? null : sessions.length === 0 ? (
        <Text className="mt-3 font-sans text-sm text-dock-text-faint">
          No trips planned — tap to add one.
        </Text>
      ) : (
        <View className="mt-3 gap-3">
          {sessions.map((s) => {
            const mine = s.owner?.id === myId;
            return (
              <View key={s.id} className="flex-row items-start gap-2.5">
                <View
                  className="mt-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: mine ? '#C9974A' : '#5C7A4C' }}
                />
                <View className="flex-1">
                  <Text className="font-sans-medium text-sm text-dock-text" numberOfLines={1}>
                    {s.lakes?.name ?? 'Lake TBC'}
                  </Text>
                  <Text className="font-sans text-xs text-dock-text-faint">
                    {new Date(s.planned_start).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {!mine && s.owner?.display_name ? ` · ${s.owner.display_name}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

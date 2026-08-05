import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentConditions } from '@/components/CurrentConditions';
import { DockRow, DockRowEmpty } from '@/components/DockRow';
import { Pressable } from '@/components/Pressable';
import { useCatchCount } from '@/hooks/useCatchCount';
import { useFriends } from '@/hooks/useFriendships';
import { useGroups } from '@/hooks/useGroups';
import { useLakes } from '@/hooks/useLakes';
import { useSessions } from '@/hooks/useSessions';
import { useSpots } from '@/hooks/useSpots';
import { useTargets } from '@/hooks/useTargets';
import { useTickets } from '@/hooks/useTickets';

export default function Home() {
  const catchCount = useCatchCount();
  const targets = useTargets();
  const sessions = useSessions();
  const groups = useGroups();
  const lakes = useLakes();
  const spots = useSpots();
  const tickets = useTickets();
  const friends = useFriends();

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-5 pt-6">
          {/* "Your Book" hero — the one warm/tactile exception in Mode 2
              (CLAUDE.md §3, Home screen). A soft gradient instead of a
              flat fill gives it real surface depth rather than a pasted-on
              card. */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Pressable
              onPress={() => router.push('/book')}
              scaleTo={0.98}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <LinearGradient
                colors={['#FBF8F1', '#EFE9DB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, padding: 24, overflow: 'hidden' }}
              >
                <Text className="font-serif text-2xl text-moss">Your Book</Text>
                <Text className="mt-1 font-sans text-sm text-ink/70">
                  {catchCount.data
                    ? `${catchCount.data} capture${catchCount.data === 1 ? '' : 's'} kept.`
                    : 'Every capture, kept.'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Current conditions — a live readout, not a forecast/rating
              (that's deliberately out of scope, see CLAUDE.md discussion).
              Quietly omits itself if location access isn't available. */}
          <CurrentConditions />

          {/* Icon dock — CLAUDE.md §3, Home screen. Tap the icon to open the
              full page; tap the rest of the row to peek inline. */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            className="mt-8 overflow-hidden rounded-2xl bg-dock-panel"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <DockRow icon="stats-chart" label="Stats" count={0} route="/stats">
              {catchCount.isLoading || sessions.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : (
                <View className="gap-1">
                  <Text className="font-sans text-sm text-dock-text-dim">
                    {catchCount.data ?? 0} catches logged
                  </Text>
                  <Text className="font-sans text-sm text-dock-text-dim">
                    {sessions.data?.length ?? 0} sessions logged
                  </Text>
                </View>
              )}
            </DockRow>

            <DockRow icon="locate" label="Targets" count={targets.data?.length ?? 0} route="/targets">
              {targets.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : targets.data && targets.data.length > 0 ? (
                <View className="gap-1.5">
                  {targets.data.slice(0, 3).map((t) => (
                    <Text key={t.id} className="font-sans text-sm text-dock-text-dim">
                      {t.known_fish?.name ?? t.target_sub_type ?? 'Target'}
                      {t.lakes?.name ? ` · ${t.lakes.name}` : ''}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No targets yet — add one from the Targets page." />
              )}
            </DockRow>

            <DockRow icon="calendar" label="Sessions" count={sessions.data?.length ?? 0} route="/sessions">
              {sessions.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : sessions.data && sessions.data.length > 0 ? (
                <View className="gap-1.5">
                  {sessions.data.slice(0, 3).map((s) => (
                    <Text key={s.id} className="font-sans text-sm text-dock-text-dim">
                      {s.lakes?.name ?? 'Lake TBC'} ·{' '}
                      {new Date(s.planned_start).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No sessions planned yet." />
              )}
            </DockRow>

            <DockRow icon="people" label="Groups" count={groups.data?.length ?? 0} route="/groups">
              {groups.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : groups.data && groups.data.length > 0 ? (
                <View className="gap-1.5">
                  {groups.data.slice(0, 3).map((g) => (
                    <Text key={g.id} className="font-sans text-sm text-dock-text-dim">
                      {g.name}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No groups yet — create one to start sharing." />
              )}
            </DockRow>

            <DockRow icon="water" label="Favourite Lakes" count={lakes.data?.length ?? 0} route="/lakes">
              {lakes.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : lakes.data && lakes.data.length > 0 ? (
                <View className="gap-1.5">
                  {lakes.data.slice(0, 3).map((l) => (
                    <Text key={l.id} className="font-sans text-sm text-dock-text-dim">
                      {l.name}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No lakes saved yet." />
              )}
            </DockRow>

            <DockRow icon="navigate" label="Spots" count={spots.data?.length ?? 0} route="/spots">
              {spots.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : spots.data && spots.data.length > 0 ? (
                <View className="gap-1.5">
                  {spots.data.slice(0, 3).map((s) => (
                    <Text key={s.id} className="font-sans text-sm text-dock-text-dim">
                      {s.name ?? s.swims?.name ?? 'Spot'}
                      {s.lakes?.name ? ` · ${s.lakes.name}` : ''}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No spots marked yet — build your intel as you fish." />
              )}
            </DockRow>

            <DockRow icon="ticket" label="Syndicate Tickets" count={tickets.data?.length ?? 0} route="/tickets">
              {tickets.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : tickets.data && tickets.data.length > 0 ? (
                <View className="gap-1.5">
                  {tickets.data.slice(0, 3).map((t) => (
                    <Text key={t.id} className="font-sans text-sm text-dock-text-dim">
                      {t.syndicate_name ?? t.lakes?.name ?? 'Ticket'} ·{' '}
                      <Text className={t.status === 'held' ? 'text-dock-moss' : 'text-dock-amber'}>
                        {t.status}
                      </Text>
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No tickets tracked yet." />
              )}
            </DockRow>

            <DockRow icon="person-add" label="Friends" count={friends.data?.length ?? 0} route="/friends">
              {friends.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : friends.data && friends.data.length > 0 ? (
                <View className="gap-1.5">
                  {friends.data.slice(0, 3).map((f) => (
                    <Text key={f.id} className="font-sans text-sm text-dock-text-dim">
                      {f.friend?.display_name ?? 'Angler'}
                    </Text>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No friends added yet." />
              )}
            </DockRow>
          </Animated.View>
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeIn.duration(400).delay(200)}
        className="absolute bottom-8 right-6"
      >
        <Pressable
          onPress={() => router.push('/log-catch')}
          scaleTo={0.88}
          accessibilityLabel="Log a catch"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={['#D8AE6C', '#C9974A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 64,
              width: 64,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={30} color="#14170F" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

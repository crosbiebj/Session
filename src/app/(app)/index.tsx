import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentConditions } from '@/components/CurrentConditions';
import { DockRow, DockRowEmpty } from '@/components/DockRow';
import { Pressable } from '@/components/Pressable';
import { StatsWidget } from '@/components/StatsWidget';
import { UpcomingSessionsWidget } from '@/components/UpcomingSessionsWidget';
import { useCatchCount } from '@/hooks/useCatchCount';
import { useFriends, useIncomingFriendRequests, useRespondToFriendRequest } from '@/hooks/useFriendships';
import { useGroups } from '@/hooks/useGroups';
import { useLakes } from '@/hooks/useLakes';
import { useSessions } from '@/hooks/useSessions';
import { useSpots } from '@/hooks/useSpots';
import { useSetTargetAchieved, useTargets } from '@/hooks/useTargets';
import { useTickets, useUpdateTicketStatus } from '@/hooks/useTickets';

export default function Home() {
  // The tab bar is absolutely positioned (frosted-glass, floats over
  // content — see (app)/_layout.tsx) so it doesn't reserve flex space of
  // its own. Without accounting for its real height here, the FAB sits
  // right underneath it — technically present, invisible and untappable.
  const tabBarHeight = useBottomTabBarHeight();
  const catchCount = useCatchCount();
  const targets = useTargets();
  const sessions = useSessions();
  const groups = useGroups();
  const lakes = useLakes();
  const spots = useSpots();
  const tickets = useTickets();
  const friends = useFriends();
  const incomingRequests = useIncomingFriendRequests();
  const setTargetAchieved = useSetTargetAchieved();
  const updateTicketStatus = useUpdateTicketStatus();
  const respondToRequest = useRespondToFriendRequest();

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}>
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
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-serif text-2xl text-moss">Your Book</Text>
                    <Text className="mt-1 font-sans text-sm text-ink/70">
                      {catchCount.data
                        ? `${catchCount.data} capture${catchCount.data === 1 ? '' : 's'} kept.`
                        : 'Every capture, kept.'}
                    </Text>
                  </View>
                  {/* A nested Pressable takes the tap over the card's own
                      "open the Book" press — no stopPropagation needed,
                      that's how RN resolves overlapping touch targets. */}
                  <Pressable
                    onPress={() => router.push('/log-catch')}
                    scaleTo={0.85}
                    hitSlop={8}
                    accessibilityLabel="Log a catch"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-moss">
                      <Ionicons name="add" size={22} color="#F5F1E8" />
                    </View>
                  </Pressable>
                </View>
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

            <DockRow
              icon="locate"
              label="Targets"
              count={targets.data?.length ?? 0}
              route="/targets"
              addRoute="/targets?add=1"
              addLabel="Add Target"
              viewLabel="Targets"
              viewIcon="locate-outline"
            >
              {targets.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : targets.data && targets.data.length > 0 ? (
                <View className="gap-2">
                  {targets.data.slice(0, 3).map((t) => (
                    <View key={t.id} className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 font-sans text-sm text-dock-text-dim">
                        {t.known_fish?.name ?? t.target_sub_type ?? 'Target'}
                        {t.lakes?.name ? ` · ${t.lakes.name}` : ''}
                      </Text>
                      <Pressable
                        onPress={() => setTargetAchieved.mutate({ id: t.id, achieved: !t.achieved_at })}
                        hitSlop={6}
                        className={`rounded-full px-2.5 py-1 ${t.achieved_at ? 'bg-dock-amber/20' : 'bg-white/10'}`}
                      >
                        <Text
                          className={`font-label text-[10px] uppercase tracking-wide ${
                            t.achieved_at ? 'text-dock-amber' : 'text-dock-text-dim'
                          }`}
                        >
                          {t.achieved_at ? 'Achieved' : 'Mark achieved'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No targets yet — add one from the Targets page." />
              )}
            </DockRow>

            <DockRow
              icon="calendar"
              label="Sessions"
              count={sessions.data?.length ?? 0}
              route="/sessions"
              addRoute="/sessions?add=1"
              addLabel="Plan Session"
              viewLabel="Sessions"
              viewIcon="calendar-outline"
            >
              {sessions.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : sessions.data && sessions.data.length > 0 ? (
                <View className="gap-1.5">
                  {sessions.data.slice(0, 3).map((s) => (
                    <Pressable key={s.id} onPress={() => router.push(`/sessions/${s.id}`)} scaleTo={0.98}>
                      <Text className="font-sans text-sm text-dock-text-dim">
                        {s.lakes?.name ?? 'Lake TBC'} ·{' '}
                        {new Date(s.planned_start).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No sessions planned yet." />
              )}
            </DockRow>

            <DockRow
              icon="people"
              label="Groups"
              count={groups.data?.length ?? 0}
              route="/groups"
              addRoute="/groups?add=1"
              addLabel="Create Group"
              viewLabel="Groups"
              viewIcon="people-outline"
            >
              {groups.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : groups.data && groups.data.length > 0 ? (
                <View className="gap-1.5">
                  {groups.data.slice(0, 3).map((g) => (
                    <Pressable key={g.id} onPress={() => router.push(`/groups/${g.id}`)} scaleTo={0.98}>
                      <Text className="font-sans text-sm text-dock-text-dim">{g.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No groups yet — create one to start sharing." />
              )}
            </DockRow>

            <DockRow
              icon="water"
              label="Favourite Lakes"
              count={lakes.data?.length ?? 0}
              route="/lakes"
              addRoute="/lakes?add=1"
              addLabel="Add Lake"
              viewLabel="Saved Lakes"
              viewIcon="water-outline"
            >
              {lakes.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : lakes.data && lakes.data.length > 0 ? (
                <View className="gap-1.5">
                  {lakes.data.slice(0, 3).map((l) => (
                    <Pressable key={l.id} onPress={() => router.push(`/lakes/${l.id}`)} scaleTo={0.98}>
                      <Text className="font-sans text-sm text-dock-text-dim">{l.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No lakes saved yet." />
              )}
            </DockRow>

            <DockRow
              icon="navigate"
              label="Spots"
              count={spots.data?.length ?? 0}
              route="/spots"
              addRoute="/spots?add=1"
              addLabel="Add Spot"
              viewLabel="Saved Spots"
              viewIcon="navigate-outline"
            >
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

            <DockRow
              icon="ticket"
              label="Syndicate Tickets"
              count={tickets.data?.length ?? 0}
              route="/tickets"
              addRoute="/tickets?add=1"
              addLabel="Add Ticket"
              viewLabel="Tickets"
              viewIcon="ticket-outline"
            >
              {tickets.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : tickets.data && tickets.data.length > 0 ? (
                <View className="gap-2">
                  {tickets.data.slice(0, 3).map((t) => (
                    <View key={t.id} className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 font-sans text-sm text-dock-text-dim">
                        {t.syndicate_name ?? t.lakes?.name ?? 'Ticket'}
                      </Text>
                      <Pressable
                        onPress={() =>
                          updateTicketStatus.mutate({
                            id: t.id,
                            status: t.status === 'held' ? 'wanted' : 'held',
                          })
                        }
                        hitSlop={6}
                        className={`rounded-full px-2.5 py-1 ${
                          t.status === 'held' ? 'bg-dock-moss/20' : 'bg-dock-amber/20'
                        }`}
                      >
                        <Text
                          className={`font-label text-[10px] uppercase tracking-wide ${
                            t.status === 'held' ? 'text-dock-moss' : 'text-dock-amber'
                          }`}
                        >
                          {t.status}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <DockRowEmpty label="No tickets tracked yet." />
              )}
            </DockRow>

            <DockRow
              icon="person-add"
              label="Friends"
              count={incomingRequests.data?.length || friends.data?.length || 0}
              route="/friends"
              addRoute="/friends?add=1"
              addLabel="Add Friend"
              viewLabel="Friends"
              viewIcon="people-outline"
            >
              {friends.isLoading ? (
                <ActivityIndicator color="#5C7A4C" />
              ) : (
                <View className="gap-2">
                  {incomingRequests.data && incomingRequests.data.length > 0
                    ? incomingRequests.data.map((req) => (
                        <View key={req.id} className="flex-row items-center justify-between gap-2">
                          <Text className="flex-1 font-sans text-sm text-dock-amber">
                            {req.requester?.display_name ?? 'Angler'} wants to connect
                          </Text>
                          <View className="flex-row gap-1.5">
                            <Pressable
                              onPress={() => respondToRequest.mutate({ friendshipId: req.id, accept: false })}
                              hitSlop={6}
                              className="h-6 w-6 items-center justify-center rounded-full bg-white/10"
                            >
                              <Ionicons name="close" size={13} color="#8B9184" />
                            </Pressable>
                            <Pressable
                              onPress={() => respondToRequest.mutate({ friendshipId: req.id, accept: true })}
                              hitSlop={6}
                              className="h-6 w-6 items-center justify-center rounded-full bg-dock-moss"
                            >
                              <Ionicons name="checkmark" size={13} color="#EDEBE0" />
                            </Pressable>
                          </View>
                        </View>
                      ))
                    : null}
                  {friends.data && friends.data.length > 0 ? (
                    friends.data
                      .slice(0, 3)
                      .map((f) => (
                        <Text key={f.id} className="font-sans text-sm text-dock-text-dim">
                          {f.friend?.display_name ?? 'Angler'}
                        </Text>
                      ))
                  ) : !incomingRequests.data?.length ? (
                    <DockRowEmpty label="No friends added yet." />
                  ) : null}
                </View>
              )}
            </DockRow>
          </Animated.View>

          {/* Two widgets filling the space below the dock — upcoming
              trips (yours and anything a group's shared with you) and a
              quick stats front door, rather than leaving it empty. */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            className="mt-4 flex-row gap-3"
          >
            <UpcomingSessionsWidget />
            <StatsWidget />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

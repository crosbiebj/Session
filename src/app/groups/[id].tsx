import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickAvatarPhoto } from '@/components/PhotoPicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useFriends } from '@/hooks/useFriendships';
import {
  useAddGroupMember,
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useGroup,
  useGroupMembers,
  usePendingJoinRequests,
  useUpdateGroupAvatar,
} from '@/hooks/useGroups';
import { useLakes } from '@/hooks/useLakes';
import { useGroupSessions } from '@/hooks/useSessions';
import { useSpots } from '@/hooks/useSpots';
import { describeError } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-full bg-dock-moss/15"
        style={{ borderWidth: 1, borderColor: '#5C7A4C4D' }}
      >
        <Ionicons name={icon} size={19} color="#5C7A4C" />
      </View>
      <Text className="font-sans-medium text-base text-dock-text">{label}</Text>
    </View>
  );
}

// "The group screen should be similar to the home screen... have the same
// bar, etc etc." Was a flat member list and nothing else — this makes it
// a real hub scoped to the group, matching Home's icon-circle chrome
// (SectionHeader) for each section rather than plain list text.
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((state) => state.session?.user.id);
  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const { data: friends } = useFriends();
  const { data: groupLakes } = useLakes({ groupId: id });
  const { data: groupSpots } = useSpots({ groupId: id });
  const { data: groupSessions } = useGroupSessions(id);
  const addMember = useAddGroupMember();

  const isOwner = members?.some((m) => m.user_id === myId && m.role === 'owner') ?? false;
  const { data: pendingRequests } = usePendingJoinRequests(isOwner ? id : undefined);
  const approveRequest = useApproveJoinRequest();
  const declineRequest = useDeclineJoinRequest();
  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  const addableFriends = (friends ?? []).filter((f) => f.friend && !memberIds.has(f.friend.id));
  const updateAvatar = useUpdateGroupAvatar();
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleShareCode = () => {
    if (!group?.invite_code) return;
    Share.share({
      message: `Join "${group.name}" on (OB)Session — enter this code under Groups: ${group.invite_code}`,
    });
  };

  const handlePickBanner = async () => {
    const photo = await pickAvatarPhoto();
    if (!photo) return;
    setAvatarError(null);
    try {
      await updateAvatar.mutateAsync({ groupId: id, base64: photo.base64, fileExtension: photo.fileExtension });
    } catch (err) {
      setAvatarError(describeError(err));
    }
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
          {group?.name ?? 'Group'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Group banner — Ben: "we have our own group icon... we'd like to
          have that at the top of the group page as a banner." Owner-only
          edit affordance (avatars_storage_insert/update RLS is
          is_group_owner-gated, same restriction as other group-wide
          settings); everyone else just sees it. */}
      <Pressable
        onPress={isOwner ? handlePickBanner : undefined}
        disabled={!isOwner || updateAvatar.isPending}
        className="relative h-32 w-full overflow-hidden"
      >
        {group?.avatarSignedUrl ? (
          <Image source={{ uri: group.avatarSignedUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#232A1C', '#14170F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="people" size={28} color="#5C7A4C" />
          </LinearGradient>
        )}
        {isOwner ? (
          <View className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50">
            {updateAvatar.isPending ? (
              <ActivityIndicator size="small" color="#EDEBE0" />
            ) : (
              <Ionicons name="camera" size={15} color="#EDEBE0" />
            )}
          </View>
        ) : null}
      </Pressable>
      {avatarError ? (
        <Text className="px-5 pt-2 font-sans text-xs text-red-400">{avatarError}</Text>
      ) : null}

      {groupLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
          {/* Calendar — Ben: "book my sessions and see who is going to come
              with me." Booking already existed (Sessions' "Visible to"
              picker); this is the aggregated group-side view of it. */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SectionHeader icon="calendar" label={`${group?.name ?? 'Group'} Calendar`} />
              <Pressable onPress={() => router.push(`/sessions?groupId=${id}`)} hitSlop={8}>
                <Text className="font-label text-[10px] uppercase tracking-wide text-dock-amber">
                  Plan a session
                </Text>
              </Pressable>
            </View>
            {groupSessions && groupSessions.length > 0 ? (
              <View className="gap-2 pl-1">
                {groupSessions.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push(`/sessions/${s.id}`)}
                    className="rounded-xl bg-dock-panel px-4 py-3 active:opacity-70"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-sans-medium text-sm text-dock-text">
                        {s.lakes?.name ?? 'Lake TBC'}
                      </Text>
                      <Text className="font-sans text-xs text-dock-text-faint">
                        {new Date(s.planned_start).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text className="mt-0.5 font-sans text-xs text-dock-moss">
                      {s.owner?.id === myId ? 'You' : (s.owner?.display_name ?? 'Angler')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="pl-1 font-sans text-sm text-dock-text-faint">
                Nothing planned yet — the first one to book a session here shows up for everyone.
              </Text>
            )}
          </View>

          {/* Lakes */}
          <View className="gap-3">
            <SectionHeader icon="water" label={`${group?.name ?? 'Group'} Lakes`} />
            {groupLakes && groupLakes.length > 0 ? (
              <View className="gap-2 pl-1">
                {groupLakes.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push(`/lakes/${l.id}`)}
                    className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3 active:opacity-70"
                  >
                    <Text className="font-sans-medium text-sm text-dock-text">{l.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#5C6154" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="pl-1 font-sans text-sm text-dock-text-faint">
                No lakes owned by this group yet — set a lake's Owner to this group from the lake's
                edit screen.
              </Text>
            )}
          </View>

          {/* Spots */}
          <View className="gap-3">
            <SectionHeader icon="navigate" label={`${group?.name ?? 'Group'} Spots`} />
            {groupSpots && groupSpots.length > 0 ? (
              <View className="gap-2 pl-1">
                {groupSpots.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push(`/spots/${s.id}`)}
                    className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3 active:opacity-70"
                  >
                    <View>
                      <Text className="font-sans-medium text-sm text-dock-text">
                        {s.name ?? s.swims?.name ?? 'Spot'}
                      </Text>
                      {s.lakes?.name ? (
                        <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">{s.lakes.name}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#5C6154" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="pl-1 font-sans text-sm text-dock-text-faint">
                No spots marked "share with the group" yet on this group's lakes.
              </Text>
            )}
          </View>

          {/* Members */}
          <View className="gap-3">
            <SectionHeader icon="people" label="Members" />
            <View className="gap-2 pl-1">
              {(members ?? []).map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
                  className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5"
                >
                  <Text className="font-sans-medium text-base text-dock-text">
                    {item.member?.display_name ?? 'Angler'}
                  </Text>
                  {item.role === 'owner' ? (
                    <Text className="font-label text-[10px] uppercase tracking-wide text-dock-amber">Owner</Text>
                  ) : null}
                </Animated.View>
              ))}
              {!membersLoading && (!members || members.length === 0) ? (
                <Text className="font-sans text-sm text-dock-text-faint">No members yet.</Text>
              ) : null}
            </View>
          </View>

          {isOwner ? (
            <View className="gap-6 border-t border-dock-border pt-6">
              <Pressable
                onPress={handleShareCode}
                className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5"
              >
                <View>
                  <Text className="font-label text-[10px] uppercase tracking-widest text-dock-text-faint">
                    This group's code
                  </Text>
                  <Text className="mt-0.5 font-label-semibold text-lg tracking-[3px] text-dock-amber">
                    {group?.invite_code ?? '······'}
                  </Text>
                </View>
                <Ionicons name="share-outline" size={18} color="#5C7A4C" />
              </Pressable>

              {pendingRequests && pendingRequests.length > 0 ? (
                <View className="gap-2">
                  <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                    Requests to join
                  </Text>
                  {pendingRequests.map((req) => (
                    <View
                      key={req.id}
                      className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3"
                    >
                      <Text className="font-sans-medium text-base text-dock-text">
                        {req.requester?.display_name ?? 'Angler'}
                      </Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => declineRequest.mutate({ requestId: req.id, groupId: id })}
                          hitSlop={8}
                          className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                        >
                          <Ionicons name="close" size={16} color="#8B9184" />
                        </Pressable>
                        <Pressable
                          onPress={() => approveRequest.mutate({ requestId: req.id, groupId: id })}
                          hitSlop={8}
                          className="h-8 w-8 items-center justify-center rounded-full bg-dock-moss"
                        >
                          <Ionicons name="checkmark" size={16} color="#EDEBE0" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="gap-2">
                <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                  Add from friends
                </Text>
                {addableFriends.length === 0 ? (
                  <Text className="font-sans text-sm text-dock-text-faint">
                    All your friends are already in this group.
                  </Text>
                ) : (
                  addableFriends.map((f) => (
                    <View
                      key={f.id}
                      className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3"
                    >
                      <Text className="font-sans-medium text-base text-dock-text">
                        {f.friend?.display_name ?? 'Angler'}
                      </Text>
                      <AnimatedPressable
                        onPress={() =>
                          f.friend && addMember.mutate({ groupId: id, userId: f.friend.id })
                        }
                        disabled={addMember.isPending}
                        className="rounded-full bg-dock-moss px-3 py-1.5 disabled:opacity-60"
                      >
                        <Text className="font-sans-semibold text-xs text-dock-text">Add</Text>
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

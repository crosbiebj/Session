import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Share, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useFriends } from '@/hooks/useFriendships';
import {
  useAddGroupMember,
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useGroup,
  useGroupMembers,
  usePendingJoinRequests,
} from '@/hooks/useGroups';
import { useAuthStore } from '@/stores/auth-store';

// Member management — the missing piece that made group-owned lakes and
// group-visibility spots actually reachable (Section 3, Sharing model,
// tier 1). Only the group's owner can add members (group_members_insert_owner
// RLS), so "add from friends" only shows for the owner; RLS is still the
// real backstop if this screen is ever reached by a non-owner directly.
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((state) => state.session?.user.id);
  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const { data: friends } = useFriends();
  const addMember = useAddGroupMember();

  const isOwner = members?.some((m) => m.user_id === myId && m.role === 'owner') ?? false;
  const { data: pendingRequests } = usePendingJoinRequests(isOwner ? id : undefined);
  const approveRequest = useApproveJoinRequest();
  const declineRequest = useDeclineJoinRequest();
  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  const addableFriends = (friends ?? []).filter((f) => f.friend && !memberIds.has(f.friend.id));

  const handleShareCode = () => {
    if (!group?.invite_code) return;
    Share.share({
      message: `Join "${group.name}" on (OB)Session — enter this code under Groups: ${group.invite_code}`,
    });
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

      {groupLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={members ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text className="mb-3 font-label text-xs uppercase tracking-widest text-dock-text-faint">
              Members
            </Text>
          }
          ListEmptyComponent={
            !membersLoading ? (
              <Text className="font-sans text-sm text-dock-text-faint">No members yet.</Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Animated.View
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
          )}
          ListFooterComponent={
            isOwner ? (
              <View className="mt-6 gap-6">
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
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

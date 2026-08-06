import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import {
  useFriends,
  useIncomingFriendRequests,
  useRespondToFriendRequest,
  useSendFriendRequestByCode,
} from '@/hooks/useFriendships';
import { useProfile } from '@/hooks/useProfile';
import { describeError } from '@/lib/errors';

// No username search (Section 3: nothing visible by default, no public
// directory of anglers) — a friend request needs a code the other person
// deliberately shared with you first. find_user_id_by_invite_code is the
// one narrow RLS crack that makes this possible without exposing a
// searchable user list.
export default function Friends() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: profile } = useProfile();
  const { data: friends, isLoading } = useFriends();
  const { data: incoming } = useIncomingFriendRequests();
  const respond = useRespondToFriendRequest();
  const sendByCode = useSendFriendRequestByCode();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (add === '1') {
      const timer = setTimeout(() => codeInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [add]);

  const handleSend = async () => {
    if (!code.trim()) return;
    setError(null);
    try {
      await sendByCode.mutateAsync(code.trim());
      setCode('');
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleShareCode = () => {
    if (!profile?.invite_code) return;
    Share.share({ message: `Add me on (OB)Session — my code is ${profile.invite_code}` });
  };

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
          Friends
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View className="gap-3 border-b border-dock-border px-5 py-4">
        <Pressable
          onPress={handleShareCode}
          className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5"
        >
          <View>
            <Text className="font-label text-[10px] uppercase tracking-widest text-dock-text-faint">
              Your code
            </Text>
            <Text className="mt-0.5 font-label-semibold text-lg tracking-[3px] text-dock-amber">
              {profile?.invite_code ?? '······'}
            </Text>
          </View>
          <Ionicons name="share-outline" size={18} color="#5C7A4C" />
        </Pressable>

        <View className="flex-row gap-2">
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="Enter a friend's code"
            placeholderTextColor="#5C6154"
            autoCapitalize="characters"
            maxLength={6}
            className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />
          <AnimatedPressable
            onPress={handleSend}
            disabled={sendByCode.isPending}
            className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
          >
            <Text className="font-sans-semibold text-base text-dock-text">Add</Text>
          </AnimatedPressable>
        </View>
        {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}
      </View>

      {incoming && incoming.length > 0 ? (
        <View className="gap-2 border-b border-dock-border px-5 py-4">
          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Requests
          </Text>
          {incoming.map((req) => (
            <View
              key={req.id}
              className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3"
            >
              <Text className="font-sans-medium text-base text-dock-text">
                {req.requester?.display_name ?? 'Angler'}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => respond.mutate({ friendshipId: req.id, accept: false })}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                >
                  <Ionicons name="close" size={16} color="#8B9184" />
                </Pressable>
                <Pressable
                  onPress={() => respond.mutate({ friendshipId: req.id, accept: true })}
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={friends ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">
              No friends added yet — share your code above, or enter theirs.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              className="rounded-xl bg-dock-panel px-4 py-3.5"
            >
              <Text className="font-sans-medium text-base text-dock-text">
                {item.friend?.display_name ?? 'Angler'}
              </Text>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

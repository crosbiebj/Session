import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateGroup, useGroups } from '@/hooks/useGroups';

export default function Groups() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  // "Create Group" from the Home dock's slide-out action lands here and
  // should drop straight into the input, not just show the same list.
  useEffect(() => {
    if (add === '1') {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [add]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      await createGroup.mutateAsync(newName.trim());
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that group.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        className="flex-1"
      >
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
        </Pressable>
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
          Groups
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">
              No groups yet — create one below to start sharing intel with friends.
            </Text>
          }
          renderItem={({ item, index }) => {
            const memberCount = item.group_members?.[0]?.count ?? 0;
            return (
              <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}>
                <Pressable
                  onPress={() => router.push(`/groups/${item.id}`)}
                  className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
                >
                  <Text className="font-sans-medium text-base text-dock-text">{item.name}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-sans text-xs text-dock-text-faint">
                      {memberCount} member{memberCount === 1 ? '' : 's'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#5C6154" />
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      <View className="gap-2 border-t border-dock-border px-5 py-4">
        {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}
        <View className="flex-row gap-2">
          <TextInput
            ref={nameInputRef}
            value={newName}
            onChangeText={setNewName}
            placeholder="New group name"
            placeholderTextColor="#5C6154"
            className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />
          <AnimatedPressable
            onPress={handleAdd}
            disabled={createGroup.isPending}
            className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
          >
            <Text className="font-sans-semibold text-base text-dock-text">Create</Text>
          </AnimatedPressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

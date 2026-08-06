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
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useGroups } from '@/hooks/useGroups';
import { useCreateLake, useLakes } from '@/hooks/useLakes';
import { describeError } from '@/lib/errors';

export default function Lakes() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: lakes, isLoading } = useLakes();
  const { data: groups } = useGroups();
  const createLake = useCreateLake();
  const { coords, loading: locationLoading, refetch: refetchLocation } = useCurrentLocation();
  const [newName, setNewName] = useState('');
  // Defaults off — a lake gets pinned to wherever the angler happens to be
  // when they open the app, which usually isn't the lake itself (adding
  // one from the sofa shouldn't geo-tag it as your living room). Opt in
  // deliberately when you're actually there.
  const [pinLocation, setPinLocation] = useState(false);
  const [ownerGroupId, setOwnerGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);

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
      await createLake.mutateAsync({
        name: newName.trim(),
        latitude: pinLocation ? coords?.latitude : undefined,
        longitude: pinLocation ? coords?.longitude : undefined,
        groupId: ownerGroupId,
      });
      setNewName('');
      setOwnerGroupId(null);
    } catch (err) {
      setError(describeError(err));
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
          Favourite Lakes
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={lakes ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">
              No lakes saved yet — add your first below.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}>
              <Pressable
                onPress={() => router.push(`/lakes/${item.id}`)}
                className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
              >
                <View>
                  <Text className="font-sans-medium text-base text-dock-text">{item.name}</Text>
                  {item.group_id ? (
                    <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">
                      Shared with group
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                  {item.latitude !== null ? (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="location" size={12} color="#5C7A4C" />
                      <Text className="font-sans text-xs text-dock-moss">Pinned</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color="#5C6154" />
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <View className="gap-2 border-t border-dock-border px-5 py-4">
        <Pressable
          onPress={() => {
            setPinLocation((v) => !v);
            if (!coords) refetchLocation();
          }}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons
            name={pinLocation ? 'checkbox' : 'square-outline'}
            size={16}
            color={pinLocation ? '#5C7A4C' : '#5C6154'}
          />
          <Text className="font-sans text-xs text-dock-text-dim">
            Pin my current location{locationLoading ? ' (finding you…)' : ''} — needed to
            auto-fill weather for catches here
          </Text>
        </Pressable>

        {groups && groups.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setOwnerGroupId(null)}
              className={`rounded-full border px-3 py-1.5 ${
                ownerGroupId === null ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
              }`}
            >
              <Text
                className={`font-label text-xs uppercase tracking-wide ${
                  ownerGroupId === null ? 'text-dock-amber' : 'text-dock-text-dim'
                }`}
              >
                Personal
              </Text>
            </Pressable>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setOwnerGroupId(g.id)}
                className={`rounded-full border px-3 py-1.5 ${
                  ownerGroupId === g.id ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                }`}
              >
                <Text
                  className={`font-label text-xs uppercase tracking-wide ${
                    ownerGroupId === g.id ? 'text-dock-amber' : 'text-dock-text-dim'
                  }`}
                >
                  {g.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

        <View className="flex-row gap-2">
          <TextInput
            ref={nameInputRef}
            value={newName}
            onChangeText={setNewName}
            placeholder="Add a lake"
            placeholderTextColor="#5C6154"
            className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />
          <AnimatedPressable
            onPress={handleAdd}
            disabled={createLake.isPending}
            className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
          >
            <Text className="font-sans-semibold text-base text-dock-text">Add</Text>
          </AnimatedPressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

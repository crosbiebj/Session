import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFriends } from '@/hooks/useFriendships';
import { useGroups } from '@/hooks/useGroups';
import { useDeleteLake, useLake, useShareLakeWithFriend, useUpdateLake } from '@/hooks/useLakes';
import { useSpots } from '@/hooks/useSpots';
import { useCreateSwim, useSwims } from '@/hooks/useSwims';
import { describeError } from '@/lib/errors';

// "When I go to lakes, I should see my saved spots for that lake" — but
// since each lake names its swims differently (Arrow Pit's "Mollie Moo's"
// means nothing anywhere else), the drill-down goes lake > swim > that
// swim's spots, not a flat spot list. Spots logged without a swim still
// show here so nothing saved gets orphaned by the hierarchy. The lake's
// own name/location is now editable too ("that saved lake? editable").
export default function LakeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lake, isLoading: lakeLoading } = useLake(id);
  const { data: swims, isLoading: swimsLoading } = useSwims(id);
  const { data: spots } = useSpots({ lakeId: id });
  const { data: groups } = useGroups();
  const { data: friends } = useFriends();
  const createSwim = useCreateSwim();
  const updateLake = useUpdateLake();
  const deleteLake = useDeleteLake();
  const shareLake = useShareLakeWithFriend();
  const { coords, loading: locationLoading, refetch: refetchLocation } = useCurrentLocation();
  const [newSwimName, setNewSwimName] = useState('');

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [pinLocation, setPinLocation] = useState(false);
  const [ownerGroupId, setOwnerGroupId] = useState<string | null>(null);
  const [shareFriendId, setShareFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (lake) {
      setEditName(lake.name);
      setPinLocation(lake.latitude !== null);
      setOwnerGroupId(lake.group_id);
    }
  }, [lake]);

  const unassignedSpots = (spots ?? []).filter((s) => !s.swim_id);

  const handleAddSwim = async () => {
    if (!id || !newSwimName.trim()) return;
    await createSwim.mutateAsync({ lakeId: id, name: newSwimName.trim() });
    setNewSwimName('');
  };

  const handleSaveLake = async () => {
    if (!lake || !editName.trim()) return;
    setError(null);
    setSaved(false);
    try {
      await updateLake.mutateAsync({
        id: lake.id,
        name: editName.trim(),
        latitude: pinLocation ? (coords?.latitude ?? lake.latitude) : null,
        longitude: pinLocation ? (coords?.longitude ?? lake.longitude) : null,
        groupId: ownerGroupId,
      });
      if (shareFriendId) {
        await shareLake.mutateAsync({ lakeId: lake.id, friendUserId: shareFriendId });
        setShareFriendId(null);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const confirmDeleteLake = () => {
    if (!lake) return;
    Alert.alert(
      `Delete "${lake.name}"?`,
      'This removes it from your list, but you can restore it later from Recently Deleted in Profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLake.mutateAsync(lake.id);
              router.back();
            } catch (err) {
              setError(describeError(err));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between border-b border-dock-border px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
          </Pressable>
          <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text" numberOfLines={1}>
            {lake?.name ?? 'Lake'}
          </Text>
          <Pressable
            onPress={() => setEditing((e) => !e)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name={editing ? 'close' : 'pencil'} size={17} color="#EDEBE0" />
          </Pressable>
        </View>

        {lakeLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#5C7A4C" />
          </View>
        ) : (
          <FlatList
            data={swims ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              <View className="mb-4 gap-3">
                {editing ? (
                  <View className="gap-3 rounded-xl bg-dock-panel p-4">
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Lake name"
                      placeholderTextColor="#5C6154"
                      className="rounded-lg bg-white/10 px-4 py-3 font-sans text-base text-dock-text"
                    />
                    <Pressable
                      onPress={() => {
                        setPinLocation((v) => !v);
                        if (!coords) refetchLocation();
                      }}
                      className="flex-row items-center gap-1.5 py-1"
                    >
                      <Ionicons
                        name={pinLocation ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={pinLocation ? '#5C7A4C' : '#5C6154'}
                      />
                      <Text className="flex-1 font-sans text-xs text-dock-text-dim">
                        Pin my current location{locationLoading ? ' (finding you…)' : ''}
                      </Text>
                    </Pressable>

                    {groups && groups.length > 0 ? (
                      <View className="gap-2">
                        <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                          Owner
                        </Text>
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
                      </View>
                    ) : null}

                    {friends && friends.length > 0 ? (
                      <View className="gap-2">
                        <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                          Share with a friend
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {friends.map((f) => (
                            <Pressable
                              key={f.id}
                              onPress={() =>
                                setShareFriendId((cur) => (cur === f.friend?.id ? null : (f.friend?.id ?? null)))
                              }
                              className={`rounded-full border px-3.5 py-1.5 ${
                                shareFriendId === f.friend?.id
                                  ? 'border-dock-amber bg-dock-amber/20'
                                  : 'border-dock-border'
                              }`}
                            >
                              <Text
                                className={`font-sans text-xs ${
                                  shareFriendId === f.friend?.id ? 'text-dock-amber' : 'text-dock-text-dim'
                                }`}
                              >
                                {f.friend?.display_name ?? 'Angler'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

                    <AnimatedPressable
                      onPress={handleSaveLake}
                      disabled={updateLake.isPending}
                      className="items-center rounded-lg bg-dock-moss py-2.5 disabled:opacity-40"
                    >
                      <Text className="font-sans-semibold text-sm text-dock-text">
                        {saved ? 'Saved' : 'Save Changes'}
                      </Text>
                    </AnimatedPressable>

                    <Pressable
                      onPress={confirmDeleteLake}
                      className="flex-row items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-2.5 active:opacity-70"
                    >
                      <Ionicons name="trash-outline" size={14} color="#F87171" />
                      <Text className="font-sans-medium text-sm text-red-400">Delete Lake</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="gap-1">
                    {lake?.group_id ? (
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="people" size={12} color="#5C7A4C" />
                        <Text className="font-sans text-xs text-dock-moss">Shared with group</Text>
                      </View>
                    ) : null}
                    {lake?.latitude !== null && lake !== undefined ? (
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="location" size={12} color="#5C7A4C" />
                        <Text className="font-sans text-xs text-dock-text-faint">
                          Location pinned — weather auto-fills for catches here
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <Text className="mt-1 font-label text-xs uppercase tracking-widest text-dock-text-faint">
                  Swims
                </Text>
              </View>
            }
            ListEmptyComponent={
              !swimsLoading ? (
                <Text className="font-sans text-sm text-dock-text-faint">
                  No swims added yet — every lake names them differently, so add the ones you fish
                  below.
                </Text>
              ) : null
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}>
                <Pressable
                  onPress={() => router.push(`/swims/${item.id}`)}
                  className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
                >
                  <Text className="font-sans-medium text-base text-dock-text">{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#5C6154" />
                </Pressable>
              </Animated.View>
            )}
            ListFooterComponent={
              <View className="gap-3">
                {unassignedSpots.length > 0 ? (
                  <View className="mt-4 gap-2">
                    <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                      Spots not tied to a swim
                    </Text>
                    {unassignedSpots.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => router.push(`/spots/${s.id}`)}
                        className="rounded-xl bg-dock-panel px-4 py-3 active:opacity-70"
                      >
                        <Text className="font-sans-medium text-base text-dock-text">
                          {s.name ?? 'Spot'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  <TextInput
                    value={newSwimName}
                    onChangeText={setNewSwimName}
                    placeholder="Add a swim (e.g. Mollie Moo's)"
                    placeholderTextColor="#5C6154"
                    className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
                  />
                  <AnimatedPressable
                    onPress={handleAddSwim}
                    disabled={createSwim.isPending}
                    className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
                  >
                    <Text className="font-sans-semibold text-base text-dock-text">Add</Text>
                  </AnimatedPressable>
                </View>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTypePicker } from '@/components/BottomTypePicker';
import { LakePicker } from '@/components/LakePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { RodLengthPicker } from '@/components/RodLengthPicker';
import { SwimPicker } from '@/components/SwimPicker';
import { useFriends } from '@/hooks/useFriendships';
import { useCreateSpot, useShareSpotWithFriend, useSpots } from '@/hooks/useSpots';
import type { Lake, Swim } from '@/types/database';

type ShareMode = 'private' | 'friend' | 'group';

export default function Spots() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: spots, isLoading } = useSpots();
  const { data: friends } = useFriends();
  const createSpot = useCreateSpot();
  const shareSpot = useShareSpotWithFriend();
  const [showAdd, setShowAdd] = useState(add === '1');

  const [lake, setLake] = useState<Lake | null>(null);
  const [name, setName] = useState('');
  const [swim, setSwim] = useState<Swim | null>(null);
  const [marker, setMarker] = useState('');
  const [bearing, setBearing] = useState('');
  const [rodLengthFt, setRodLengthFt] = useState<number | null>(null);
  const [wraps, setWraps] = useState('');
  const [depth, setDepth] = useState('');
  const [depthUnit, setDepthUnit] = useState<'m' | 'ft'>('m');
  const [bottomTypes, setBottomTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode>('private');
  const [shareFriendId, setShareFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setLake(null);
    setName('');
    setSwim(null);
    setMarker('');
    setBearing('');
    setRodLengthFt(null);
    setWraps('');
    setDepth('');
    setDepthUnit('m');
    setBottomTypes([]);
    setNotes('');
    setShareMode('private');
    setShareFriendId(null);
  };

  const handleAdd = async () => {
    if (!lake) return;
    setError(null);
    const depthNum = depth ? parseFloat(depth) : null;
    const depthM = depthNum === null || Number.isNaN(depthNum) ? null : depthUnit === 'ft' ? depthNum * 0.3048 : depthNum;
    const bearingNum = bearing ? Math.round(parseFloat(bearing)) : null;
    const wrapsNum = wraps ? Math.round(parseFloat(wraps)) : null;

    try {
      const spot = await createSpot.mutateAsync({
        lakeId: lake.id,
        swimId: swim?.id ?? null,
        name: name.trim() || null,
        farBankMarker: marker.trim() || null,
        bearingDegrees: bearingNum !== null && !Number.isNaN(bearingNum) ? bearingNum : null,
        rodLengthFt,
        distanceWraps: wrapsNum !== null && !Number.isNaN(wrapsNum) ? wrapsNum : null,
        distanceEstimateM: null,
        depthM,
        bottomType: bottomTypes.length > 0 ? bottomTypes.join(', ') : null,
        notes: notes.trim() || null,
        // group visibility is only legal on a group-owned lake (RLS
        // enforces this too) — force private if the lake changed under
        // the toggle's feet.
        visibility: lake.group_id && shareMode === 'group' ? 'group' : 'private',
      });

      if (shareMode === 'friend' && shareFriendId) {
        await shareSpot.mutateAsync({ spotId: spot.id, friendUserId: shareFriendId });
      }

      resetForm();
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that spot.');
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
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
          Spots
        </Text>
        <Pressable
          onPress={() => setShowAdd((s) => !s)}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name={showAdd ? 'close' : 'add'} size={20} color="#EDEBE0" />
        </Pressable>
      </View>

      {showAdd ? (
        <View className="gap-3 border-b border-dock-border px-5 py-4">
          <LakePicker
            selectedLake={lake}
            onSelect={(l) => {
              setLake(l);
              // Swims are lake-scoped — a swim picked for the previous
              // lake makes no sense once the lake changes. Same for
              // "share with group": it's only legal on a group-owned lake.
              setSwim(null);
              setShareMode('private');
            }}
            variant="dock"
          />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Spot name (e.g. The Willow Swim)"
            placeholderTextColor="#5C6154"
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />

          <SwimPicker lakeId={lake?.id ?? null} selectedSwim={swim} onSelect={setSwim} />

          <TextInput
            value={marker}
            onChangeText={setMarker}
            placeholder="Far bank marker to cast towards (e.g. the dead tree)"
            placeholderTextColor="#5C6154"
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />

          <View className="flex-row gap-3">
            <TextInput
              value={bearing}
              onChangeText={setBearing}
              placeholder="Bearing (0-359°)"
              placeholderTextColor="#5C6154"
              keyboardType="number-pad"
              className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <View className="flex-1 flex-row items-center rounded-lg bg-dock-panel pr-1.5">
              <TextInput
                value={depth}
                onChangeText={setDepth}
                placeholder="Depth"
                placeholderTextColor="#5C6154"
                keyboardType="decimal-pad"
                className="flex-1 px-4 py-3 font-sans text-base text-dock-text"
              />
              <Pressable
                onPress={() => setDepthUnit((u) => (u === 'm' ? 'ft' : 'm'))}
                hitSlop={6}
                className="rounded-md bg-white/10 px-2.5 py-1.5"
              >
                <Text className="font-label text-xs uppercase tracking-wide text-dock-amber">
                  {depthUnit}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Wraps
          </Text>
          <View className="flex-row gap-3">
            <TextInput
              value={wraps}
              onChangeText={setWraps}
              placeholder="Wrap count"
              placeholderTextColor="#5C6154"
              keyboardType="number-pad"
              className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <View className="flex-1">
              <RodLengthPicker value={rodLengthFt} onChange={setRodLengthFt} />
            </View>
          </View>

          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Substrate
          </Text>
          <BottomTypePicker value={bottomTypes} onChange={setBottomTypes} />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor="#5C6154"
            multiline
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />

          <View className="gap-2">
            <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
              Share
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShareMode('private')}
                className={`flex-1 items-center rounded-lg border py-2.5 ${
                  shareMode === 'private' ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                }`}
              >
                <Text
                  className={`font-label text-xs uppercase tracking-wide ${
                    shareMode === 'private' ? 'text-dock-amber' : 'text-dock-text-dim'
                  }`}
                >
                  Private
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShareMode('friend')}
                className={`flex-1 items-center rounded-lg border py-2.5 ${
                  shareMode === 'friend' ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                }`}
              >
                <Text
                  className={`font-label text-xs uppercase tracking-wide ${
                    shareMode === 'friend' ? 'text-dock-amber' : 'text-dock-text-dim'
                  }`}
                >
                  A friend
                </Text>
              </Pressable>
              {lake?.group_id ? (
                <Pressable
                  onPress={() => setShareMode('group')}
                  className={`flex-1 items-center rounded-lg border py-2.5 ${
                    shareMode === 'group' ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                  }`}
                >
                  <Text
                    className={`font-label text-xs uppercase tracking-wide ${
                      shareMode === 'group' ? 'text-dock-amber' : 'text-dock-text-dim'
                    }`}
                  >
                    The group
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {shareMode === 'friend' ? (
              friends && friends.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {friends.map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() => setShareFriendId(f.friend?.id ?? null)}
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
              ) : (
                <Text className="font-sans text-xs text-dock-text-faint">
                  No friends added yet — add one from Friends first.
                </Text>
              )
            ) : null}
          </View>

          {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

          <AnimatedPressable
            onPress={handleAdd}
            disabled={!lake || (shareMode === 'friend' && !shareFriendId) || createSpot.isPending}
            className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
          >
            {createSpot.isPending ? (
              <ActivityIndicator color="#EDEBE0" />
            ) : (
              <Text className="font-sans-semibold text-base text-dock-text">Save Spot</Text>
            )}
          </AnimatedPressable>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={spots ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">
              No spots logged yet. Tap + to mark your first one.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              className="rounded-xl bg-dock-panel px-4 py-3.5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-1.5">
                  <Text className="font-sans-medium text-base text-dock-text">
                    {item.name ?? item.swims?.name ?? 'Spot'}
                  </Text>
                  {item.visibility === 'group' ? (
                    <Ionicons name="people" size={12} color="#C9974A" />
                  ) : null}
                </View>
                {item.lakes?.name ? (
                  <Text className="font-sans text-xs text-dock-moss">
                    {item.lakes.name}
                    {item.swims?.name ? ` · ${item.swims.name}` : ''}
                  </Text>
                ) : null}
              </View>
              {item.far_bank_marker ? (
                <View className="mt-1 flex-row items-center gap-1">
                  <Ionicons name="navigate" size={11} color="#5C7A4C" />
                  <Text className="font-sans text-xs text-dock-text-dim">
                    Cast towards {item.far_bank_marker}
                  </Text>
                </View>
              ) : null}
              <View className="mt-1.5 flex-row flex-wrap gap-x-3 gap-y-0.5">
                {item.swims?.name && item.name ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.swims.name}</Text>
                ) : null}
                {item.bearing_degrees !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.bearing_degrees}°</Text>
                ) : null}
                {item.distance_wraps !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">
                    {item.distance_wraps} wraps{item.rod_length_ft ? ` @ ${item.rod_length_ft}ft` : ''}
                  </Text>
                ) : null}
                {item.depth_m !== null ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.depth_m}m deep</Text>
                ) : null}
                {item.bottom_type ? (
                  <Text className="font-sans text-xs text-dock-text-dim">{item.bottom_type}</Text>
                ) : null}
              </View>
              {item.notes ? (
                <Text className="mt-1.5 font-sans text-sm text-dock-text-dim">{item.notes}</Text>
              ) : null}
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTypePicker } from '@/components/BottomTypePicker';
import { LakePicker } from '@/components/LakePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { RodLengthPicker } from '@/components/RodLengthPicker';
import { SwimPicker } from '@/components/SwimPicker';
import { useCreateSpot, useSpots } from '@/hooks/useSpots';
import type { Lake, Swim } from '@/types/database';

export default function Spots() {
  const { data: spots, isLoading } = useSpots();
  const createSpot = useCreateSpot();
  const [showAdd, setShowAdd] = useState(false);

  const [lake, setLake] = useState<Lake | null>(null);
  const [name, setName] = useState('');
  const [swim, setSwim] = useState<Swim | null>(null);
  const [marker, setMarker] = useState('');
  const [bearing, setBearing] = useState('');
  const [rodLengthFt, setRodLengthFt] = useState<number | null>(null);
  const [wraps, setWraps] = useState('');
  const [depth, setDepth] = useState('');
  const [bottomType, setBottomType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'group'>('private');

  const resetForm = () => {
    setLake(null);
    setName('');
    setSwim(null);
    setMarker('');
    setBearing('');
    setRodLengthFt(null);
    setWraps('');
    setDepth('');
    setBottomType(null);
    setNotes('');
    setVisibility('private');
  };

  const handleAdd = async () => {
    if (!lake) return;
    await createSpot.mutateAsync({
      lakeId: lake.id,
      swimId: swim?.id ?? null,
      name: name.trim() || null,
      farBankMarker: marker.trim() || null,
      bearingDegrees: bearing ? Math.round(parseFloat(bearing)) : null,
      rodLengthFt,
      distanceWraps: wraps ? Math.round(parseFloat(wraps)) : null,
      distanceEstimateM: null,
      depthM: depth ? parseFloat(depth) : null,
      bottomType,
      notes: notes.trim() || null,
      // group visibility is only legal on a group-owned lake (RLS
      // enforces this too) — force private if the lake changed under the
      // toggle's feet.
      visibility: lake.group_id && visibility === 'group' ? 'group' : 'private',
    });
    resetForm();
    setShowAdd(false);
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
              // lake makes no sense once the lake changes. Same for group
              // visibility: it's only legal on a group-owned lake.
              setSwim(null);
              setVisibility('private');
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
            <TextInput
              value={depth}
              onChangeText={setDepth}
              placeholder="Depth (m)"
              placeholderTextColor="#5C6154"
              keyboardType="decimal-pad"
              className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
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
          <BottomTypePicker value={bottomType} onChange={setBottomType} />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor="#5C6154"
            multiline
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />

          {lake?.group_id ? (
            <View className="gap-2">
              <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
                Visibility
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setVisibility('private')}
                  className={`flex-1 items-center rounded-lg border py-2.5 ${
                    visibility === 'private' ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                  }`}
                >
                  <Text
                    className={`font-label text-xs uppercase tracking-wide ${
                      visibility === 'private' ? 'text-dock-amber' : 'text-dock-text-dim'
                    }`}
                  >
                    Private
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVisibility('group')}
                  className={`flex-1 items-center rounded-lg border py-2.5 ${
                    visibility === 'group' ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                  }`}
                >
                  <Text
                    className={`font-label text-xs uppercase tracking-wide ${
                      visibility === 'group' ? 'text-dock-amber' : 'text-dock-text-dim'
                    }`}
                  >
                    Share with group
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <AnimatedPressable
            onPress={handleAdd}
            disabled={!lake || createSpot.isPending}
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

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTypePicker } from '@/components/BottomTypePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { RodLengthPicker } from '@/components/RodLengthPicker';
import { SwimPicker } from '@/components/SwimPicker';
import { useFriends } from '@/hooks/useFriendships';
import { useDeleteSpot, useShareSpotWithFriend, useSpot, useUpdateSpot } from '@/hooks/useSpots';
import { describeError } from '@/lib/errors';
import type { Swim } from '@/types/database';

type ShareMode = 'private' | 'friend' | 'group';

// "That saved spot? Editable." — matches the create form field for field,
// just pre-filled and PATCHing instead of INSERTing. The lake itself
// isn't editable here (a spot doesn't move lakes); everything else is.
export default function SpotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: spot, isLoading } = useSpot(id);
  const { data: friends } = useFriends();
  const updateSpot = useUpdateSpot();
  const deleteSpot = useDeleteSpot();
  const shareSpot = useShareSpotWithFriend();

  const [swim, setSwim] = useState<Swim | null>(null);
  const [name, setName] = useState('');
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (spot) {
      setSwim(spot.swims ? { id: spot.swims.id, name: spot.swims.name } as Swim : null);
      setName(spot.name ?? '');
      setMarker(spot.far_bank_marker ?? '');
      setBearing(spot.bearing_degrees !== null ? String(spot.bearing_degrees) : '');
      setRodLengthFt(spot.rod_length_ft);
      setWraps(spot.distance_wraps !== null ? String(spot.distance_wraps) : '');
      setDepth(spot.depth_m !== null ? String(spot.depth_m) : '');
      setDepthUnit('m');
      setBottomTypes(spot.bottom_type ? spot.bottom_type.split(', ').filter(Boolean) : []);
      setNotes(spot.notes ?? '');
      setShareMode(spot.visibility === 'group' ? 'group' : 'private');
    }
  }, [spot]);

  const handleSave = async () => {
    if (!spot) return;
    setError(null);
    setSaved(false);
    const depthNum = depth ? parseFloat(depth) : null;
    const depthM = depthNum === null || Number.isNaN(depthNum) ? null : depthUnit === 'ft' ? depthNum * 0.3048 : depthNum;
    const bearingNum = bearing ? Math.round(parseFloat(bearing)) : null;
    const wrapsNum = wraps ? Math.round(parseFloat(wraps)) : null;

    try {
      await updateSpot.mutateAsync({
        id: spot.id,
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
        visibility: spot.lakes && shareMode === 'group' ? 'group' : 'private',
      });

      if (shareMode === 'friend' && shareFriendId) {
        await shareSpot.mutateAsync({ spotId: spot.id, friendUserId: shareFriendId });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleDelete = () => {
    if (!spot) return;
    Alert.alert(
      `Delete "${spot.name ?? 'this spot'}"?`,
      'You can restore it later from Recently Deleted in Profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSpot.mutateAsync(spot.id);
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
          <Text
            className="font-label-semibold text-base uppercase tracking-wide text-dock-text"
            numberOfLines={1}
          >
            {spot?.lakes?.name ?? 'Spot'}
          </Text>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={18} color="#8B9184" />
          </Pressable>
        </View>

        {isLoading || !spot ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#5C7A4C" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Spot name (e.g. The Willow Swim)"
              placeholderTextColor="#5C6154"
              className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />

            <SwimPicker lakeId={spot.lake_id} selectedSwim={swim} onSelect={setSwim} />

            <TextInput
              value={marker}
              onChangeText={setMarker}
              placeholder="Far bank marker to cast towards"
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
                returnKeyType="done"
                className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
              />
              <View className="flex-1 flex-row items-center rounded-lg bg-dock-panel pr-1.5">
                <TextInput
                  value={depth}
                  onChangeText={setDepth}
                  placeholder="Depth"
                  placeholderTextColor="#5C6154"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
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
                returnKeyType="done"
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
              style={{ minHeight: 90, textAlignVertical: 'top' }}
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
                {spot.lakes ? (
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
              onPress={handleSave}
              disabled={updateSpot.isPending}
              className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
            >
              {updateSpot.isPending ? (
                <ActivityIndicator color="#EDEBE0" />
              ) : (
                <Text className="font-sans-semibold text-base text-dock-text">
                  {saved ? 'Saved' : 'Save Changes'}
                </Text>
              )}
            </AnimatedPressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

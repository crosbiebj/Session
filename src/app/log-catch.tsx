import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LakePicker } from '@/components/LakePicker';
import { pickCatchPhotos, type PickedPhoto } from '@/components/PhotoPicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateCatch } from '@/hooks/useCreateCatch';
import { describeError } from '@/lib/errors';
import type { Lake } from '@/types/database';

const LB_TO_GRAMS = 453.59237;
const OZ_TO_GRAMS = 28.3495231;

// Quick-log only (photo, date & time, weight, lake) — the six detail
// tiles (Location beyond lake, Fish details, Tackle, Conditions, Session,
// Story) are deferred. See the Milestone 1 plan.
//
// Mode 2 (dark) — CLAUDE.md §6a: the Book is the only screen that stays
// warm/cream; this is a modal off the Home FAB, not the Book itself.
export default function LogCatch() {
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [pickingPhotos, setPickingPhotos] = useState(true);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lb, setLb] = useState('');
  const [oz, setOz] = useState('');
  const [selectedLake, setSelectedLake] = useState<Lake | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const createCatch = useCreateCatch();

  useEffect(() => {
    // FAB "opens straight to the photo library" (CLAUDE.md §3, Home
    // screen) — launch the picker the moment this screen mounts.
    (async () => {
      const picked = await pickCatchPhotos();
      if (picked && picked.length > 0) {
        setPhotos(picked);
      }
      setPickingPhotos(false);
    })();
  }, []);

  const handleAddPhotos = async () => {
    setPickingPhotos(true);
    const picked = await pickCatchPhotos();
    if (picked && picked.length > 0) {
      // Append rather than replace — "Add more" shouldn't discard photos
      // already chosen, and de-dupe on uri in case the same photo gets
      // picked twice.
      setPhotos((prev) => {
        const existingUris = new Set(prev.map((p) => p.uri));
        return [...prev, ...picked.filter((p) => !existingUris.has(p.uri))];
      });
    }
    setPickingPhotos(false);
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setOccurredAt(selected);
  };

  const handleSave = async () => {
    if (photos.length === 0) {
      setSaveError('Add at least one photo.');
      return;
    }
    setSaveError(null);

    const lbNum = parseFloat(lb) || 0;
    const ozNum = parseFloat(oz) || 0;
    const weightGrams = lb || oz ? Math.round(lbNum * LB_TO_GRAMS + ozNum * OZ_TO_GRAMS) : null;

    try {
      await createCatch.mutateAsync({
        occurredAt,
        weightGrams,
        lakeId: selectedLake?.id ?? null,
        lakeLatitude: selectedLake?.latitude,
        lakeLongitude: selectedLake?.longitude,
        photos: photos.map((p) => ({ base64: p.base64, fileExtension: p.fileExtension })),
      });
      router.back();
    } catch (err) {
      setSaveError(describeError(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="close" size={20} color="#EDEBE0" />
          </Pressable>
          <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
            Log a Catch
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Photos — a proper grid, not a cramped strip. "Photos are the
              hero" (CLAUDE.md §8), so this gets real visual weight. */}
          {pickingPhotos && photos.length === 0 ? (
            <View className="h-48 items-center justify-center rounded-xl bg-dock-panel">
              <ActivityIndicator color="#5C7A4C" />
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {photos.map((photo, index) => (
                <Animated.View
                  key={photo.uri}
                  entering={FadeIn.duration(250)}
                  layout={Layout.duration(200)}
                  className="relative h-[31%] w-[31%] aspect-square"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    className="h-full w-full rounded-xl"
                    resizeMode="cover"
                  />
                  {index === 0 ? (
                    <View className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5">
                      <Text className="font-label text-[10px] uppercase tracking-wide text-dock-text">
                        Cover
                      </Text>
                    </View>
                  ) : null}
                  <AnimatedPressable
                    onPress={() => handleRemovePhoto(photo.uri)}
                    scaleTo={0.8}
                    hitSlop={8}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/80"
                  >
                    <Ionicons name="close" size={14} color="#EDEBE0" />
                  </AnimatedPressable>
                </Animated.View>
              ))}
              <Animated.View layout={Layout.duration(200)} className="h-[31%] w-[31%] aspect-square">
                <AnimatedPressable
                  onPress={handleAddPhotos}
                  disabled={pickingPhotos}
                  className="h-full w-full items-center justify-center rounded-xl border border-dashed border-dock-border bg-dock-panel"
                >
                  {pickingPhotos ? (
                    <ActivityIndicator color="#5C7A4C" />
                  ) : (
                    <>
                      <Ionicons name="add" size={22} color="#C9974A" />
                      <Text className="mt-0.5 font-sans text-xs text-dock-text-dim">
                        {photos.length === 0 ? 'Add photos' : 'Add more'}
                      </Text>
                    </>
                  )}
                </AnimatedPressable>
              </Animated.View>
            </View>
          )}

          {/* Date & time */}
          <Text className="mb-2 mt-6 font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Date &amp; time
          </Text>
          <Pressable
            onPress={() => setShowDatePicker((v) => !v)}
            className="rounded-lg bg-dock-panel px-4 py-3"
          >
            <Text className="font-sans text-base text-dock-text">
              {occurredAt.toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={occurredAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={handleDateChange}
              themeVariant="dark"
            />
          ) : null}

          {/* Weight */}
          <Text className="mb-2 mt-6 font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Weight
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center rounded-lg bg-dock-panel px-4">
              <TextInput
                value={lb}
                onChangeText={setLb}
                placeholder="0"
                placeholderTextColor="#5C6154"
                keyboardType="number-pad"
                returnKeyType="done"
                className="flex-1 py-3 font-sans text-base text-dock-text"
              />
              <Text className="font-sans text-sm text-dock-text-faint">lb</Text>
            </View>
            <View className="flex-1 flex-row items-center rounded-lg bg-dock-panel px-4">
              <TextInput
                value={oz}
                onChangeText={setOz}
                placeholder="0"
                placeholderTextColor="#5C6154"
                keyboardType="number-pad"
                returnKeyType="done"
                className="flex-1 py-3 font-sans text-base text-dock-text"
              />
              <Text className="font-sans text-sm text-dock-text-faint">oz</Text>
            </View>
          </View>

          {/* Lake */}
          <Text className="mb-2 mt-6 font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Lake
          </Text>
          <LakePicker selectedLake={selectedLake} onSelect={setSelectedLake} variant="dock" />

          {saveError ? (
            <Text className="mt-4 font-sans text-sm text-red-400">{saveError}</Text>
          ) : null}

          <AnimatedPressable
            onPress={handleSave}
            disabled={createCatch.isPending}
            className="mt-8 items-center rounded-lg bg-dock-moss py-3.5 disabled:opacity-60"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {createCatch.isPending ? (
              <ActivityIndicator color="#EDEBE0" />
            ) : (
              <Text className="font-sans-semibold text-base text-dock-text">Save Catch</Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

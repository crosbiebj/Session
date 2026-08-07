import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LakePicker } from '@/components/LakePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { TargetPhotoPicker } from '@/components/TargetPhotoPicker';
import { useCreateTarget, useTargets } from '@/hooks/useTargets';
import type { FishSubType, Lake } from '@/types/database';

const SUB_TYPES: FishSubType[] = [
  'common',
  'mirror',
  'linear',
  'fully_scaled',
  'leather',
  'grass',
  'koi',
  'ghost',
];

// "Recon Mode" — CLAUDE.md §3, Targets: a deliberate tactical/military
// treatment contained strictly to this page. Olive/stencil accents, "no
// forum energy" still applies — this is a wink, not a gimmick.
export default function Targets() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: targets, isLoading } = useTargets();
  const createTarget = useCreateTarget();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [subType, setSubType] = useState<FishSubType | null>(null);
  const [showAdd, setShowAdd] = useState(add === '1');
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [lake, setLake] = useState<Lake | null>(null);

  // "All target fish will be named, even if it's just 'the big common'" —
  // name is the one required field now; sub-type stays an optional
  // refinement alongside it rather than standing in for a name itself.
  const handleAdd = async () => {
    if (!name.trim()) return;
    await createTarget.mutateAsync({
      name: name.trim(),
      lakeId: lake?.id ?? null,
      targetSubType: subType,
      notes: notes.trim() || null,
      referencePhotoId: photoId,
    });
    setName('');
    setNotes('');
    setSubType(null);
    setPhotoId(null);
    setPhotoUrl(null);
    setLake(null);
    setShowAdd(false);
  };

  const addForm = (
    <View className="gap-3 border-b border-dock-moss/30 px-5 py-4">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name this target — e.g. Petals, or The Big Common"
        placeholderTextColor="#5C6154"
        returnKeyType="next"
        className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
      />
      <LakePicker selectedLake={lake} onSelect={setLake} variant="dock" />
      <View className="flex-row flex-wrap gap-2">
        {SUB_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setSubType((s) => (s === t ? null : t))}
            className={`rounded-full border px-3 py-1.5 ${
              subType === t ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
            }`}
          >
            <Text
              className={`font-label text-xs uppercase tracking-wide ${
                subType === t ? 'text-dock-amber' : 'text-dock-text-dim'
              }`}
            >
              {t.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes — e.g. 30lb+, last seen near the island"
        placeholderTextColor="#5C6154"
        returnKeyType="done"
        className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
      />
      <TargetPhotoPicker
        selectedPhotoId={photoId}
        selectedPhotoUrl={photoUrl}
        onSelect={(id, url) => {
          setPhotoId(id);
          setPhotoUrl(url);
        }}
      />
      <AnimatedPressable
        onPress={handleAdd}
        disabled={createTarget.isPending || !name.trim()}
        className="items-center rounded-lg bg-dock-amber py-3 disabled:opacity-60"
      >
        <Text className="font-label-semibold text-sm uppercase tracking-wide text-dock-bg">
          Acquire Target
        </Text>
      </AnimatedPressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between border-b border-dock-moss/30 px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
          </Pressable>
          <Text className="font-label-semibold text-base uppercase tracking-[3px] text-dock-amber">
            Targets
          </Text>
          <Pressable
            onPress={() => setShowAdd((s) => !s)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name={showAdd ? 'close' : 'add'} size={20} color="#EDEBE0" />
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#C9974A" />
          </View>
        ) : (
          <FlatList
            data={targets ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={showAdd ? addForm : null}
            ListHeaderComponentStyle={{ marginHorizontal: -20, marginTop: -20 }}
            ListEmptyComponent={
              <Text className="font-sans text-sm text-dock-text-faint">
                No targets acquired yet. Tap + to log one.
              </Text>
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
                className="flex-row gap-3 rounded-xl border border-dock-moss/40 bg-dock-panel px-4 py-3.5"
              >
                {item.referencePhotoUrl ? (
                  <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dock-amber/40">
                    <Image
                      source={{ uri: item.referencePhotoUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                    {/* Subtle crosshair, "Recon Mode" (CLAUDE.md §3) — a
                        wink, thin lines only, not a garish red-dot sight. */}
                    <View
                      pointerEvents="none"
                      className="absolute left-0 right-0 top-1/2 h-px bg-dock-amber/50"
                    />
                    <View
                      pointerEvents="none"
                      className="absolute bottom-0 top-0 left-1/2 w-px bg-dock-amber/50"
                    />
                  </View>
                ) : null}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-label-semibold text-xs uppercase tracking-widest text-dock-amber">
                      {item.name ?? item.known_fish?.name ?? item.target_sub_type?.replace('_', ' ') ?? 'Target'}
                    </Text>
                    {item.achieved_at ? (
                      <Text className="font-label text-[10px] uppercase tracking-wide text-dock-moss">
                        Acquired
                      </Text>
                    ) : null}
                  </View>
                  {item.name && item.target_sub_type ? (
                    <Text className="mt-0.5 font-sans text-xs capitalize text-dock-text-faint">
                      {item.target_sub_type.replace('_', ' ')}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text className="mt-1 font-sans text-sm text-dock-text-dim">{item.notes}</Text>
                  ) : null}
                  {item.lakes?.name ? (
                    <Text className="mt-1 font-sans text-xs text-dock-text-faint">{item.lakes.name}</Text>
                  ) : null}
                </View>
              </Animated.View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

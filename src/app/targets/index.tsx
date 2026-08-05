import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateTarget, useTargets } from '@/hooks/useTargets';
import type { FishSubType } from '@/types/database';

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
  const { data: targets, isLoading } = useTargets();
  const createTarget = useCreateTarget();
  const [notes, setNotes] = useState('');
  const [subType, setSubType] = useState<FishSubType | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async () => {
    if (!notes.trim() && !subType) return;
    await createTarget.mutateAsync({ lakeId: null, targetSubType: subType, notes: notes.trim() || null });
    setNotes('');
    setSubType(null);
    setShowAdd(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
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

      {showAdd ? (
        <View className="gap-3 border-b border-dock-moss/30 px-5 py-4">
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
            placeholder="e.g. 30lb+ from Broom, or a named fish"
            placeholderTextColor="#5C6154"
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />
          <AnimatedPressable
            onPress={handleAdd}
            disabled={createTarget.isPending}
            className="items-center rounded-lg bg-dock-amber py-3 disabled:opacity-60"
          >
            <Text className="font-label-semibold text-sm uppercase tracking-wide text-dock-bg">
              Acquire Target
            </Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C9974A" />
        </View>
      ) : (
        <FlatList
          data={targets ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">
              No targets acquired yet. Tap + to log one.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              className="rounded-xl border border-dock-moss/40 bg-dock-panel px-4 py-3.5"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-label-semibold text-xs uppercase tracking-widest text-dock-amber">
                  {item.known_fish?.name ?? item.target_sub_type?.replace('_', ' ') ?? 'Target'}
                </Text>
                {item.achieved_at ? (
                  <Text className="font-label text-[10px] uppercase tracking-wide text-dock-moss">
                    Acquired
                  </Text>
                ) : null}
              </View>
              {item.notes ? (
                <Text className="mt-1 font-sans text-sm text-dock-text-dim">{item.notes}</Text>
              ) : null}
              {item.lakes?.name ? (
                <Text className="mt-1 font-sans text-xs text-dock-text-faint">{item.lakes.name}</Text>
              ) : null}
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

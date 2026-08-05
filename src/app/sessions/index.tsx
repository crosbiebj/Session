import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LakePicker } from '@/components/LakePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateSession, useSessions } from '@/hooks/useSessions';
import type { Lake } from '@/types/database';

export default function Sessions() {
  const { data: sessions, isLoading } = useSessions();
  const createSession = useCreateSession();
  const [showAdd, setShowAdd] = useState(false);
  const [lake, setLake] = useState<Lake | null>(null);
  const [start, setStart] = useState(new Date());
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!lake) return;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // default 24h
    await createSession.mutateAsync({
      lakeId: lake.id,
      plannedStart: start,
      plannedEnd: end,
      notes: notes.trim() || null,
    });
    setLake(null);
    setNotes('');
    setShowAdd(false);
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
          Sessions
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
          <LakePicker selectedLake={lake} onSelect={setLake} />
          <DateTimePicker
            value={start}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_e, d) => d && setStart(d)}
            themeVariant="dark"
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="#5C6154"
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />
          <AnimatedPressable
            onPress={handleAdd}
            disabled={!lake || createSession.isPending}
            className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
          >
            <Text className="font-sans-semibold text-base text-dock-text">Plan Session</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <FlatList
          data={sessions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">No sessions planned yet.</Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              className="rounded-xl bg-dock-panel px-4 py-3.5"
            >
              <Text className="font-sans-medium text-base text-dock-text">
                {item.lakes?.name ?? 'Lake TBC'}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">
                {new Date(item.planned_start).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                –{' '}
                {new Date(item.planned_end).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              {item.notes ? (
                <Text className="mt-1 font-sans text-sm text-dock-text-dim">{item.notes}</Text>
              ) : null}
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

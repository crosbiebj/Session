import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LakePicker } from '@/components/LakePicker';
import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateSession, useSessions } from '@/hooks/useSessions';
import type { Lake } from '@/types/database';

export default function Sessions() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: sessions, isLoading } = useSessions();
  const createSession = useCreateSession();
  const [showAdd, setShowAdd] = useState(add === '1');
  const [lake, setLake] = useState<Lake | null>(null);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!lake) return;
    setError(null);
    if (end <= start) {
      setError('End time needs to be after the start time.');
      return;
    }
    try {
      await createSession.mutateAsync({
        lakeId: lake.id,
        plannedStart: start,
        plannedEnd: end,
        notes: notes.trim() || null,
      });
      setLake(null);
      setNotes('');
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not plan that session.');
    }
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
          <LakePicker selectedLake={lake} onSelect={setLake} variant="dock" />

          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Starts
          </Text>
          <DateTimePicker
            value={start}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_e, d) => {
              if (!d) return;
              setStart(d);
              // Keep end from silently sitting before the new start.
              if (end <= d) setEnd(new Date(d.getTime() + 24 * 60 * 60 * 1000));
            }}
            themeVariant="dark"
          />

          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Ends
          </Text>
          <DateTimePicker
            value={end}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            minimumDate={start}
            onChange={(_e, d) => d && setEnd(d)}
            themeVariant="dark"
          />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor="#5C6154"
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
          />

          {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

          <AnimatedPressable
            onPress={handleAdd}
            disabled={!lake || createSession.isPending}
            className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
          >
            {createSession.isPending ? (
              <ActivityIndicator color="#EDEBE0" />
            ) : (
              <Text className="font-sans-semibold text-base text-dock-text">Plan Session</Text>
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
          data={sessions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          ListEmptyComponent={
            <Text className="font-sans text-sm text-dock-text-faint">No sessions planned yet.</Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}>
              <Pressable
                onPress={() => router.push(`/sessions/${item.id}`)}
                className="rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans-medium text-base text-dock-text">
                    {item.lakes?.name ?? 'Lake TBC'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#5C6154" />
                </View>
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
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

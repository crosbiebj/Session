import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useDeleteSession, useSession, useUpdateSession } from '@/hooks/useSessions';
import { describeError } from '@/lib/errors';

// "Once the session is logged you can't click into it, it just adds it
// as a dead bar which you cannot interact with. U should be able to
// click on that bar and add info to it." — a real detail/edit page,
// matching the Lake/Swim/Group detail pattern rather than a static row.
export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading } = useSession(id);
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session) {
      setStart(new Date(session.planned_start));
      setEnd(new Date(session.planned_end));
      setNotes(session.notes ?? '');
    }
  }, [session]);

  const handleSave = async () => {
    if (!start || !end) return;
    setError(null);
    setSaved(false);
    if (end <= start) {
      setError('End time needs to be after the start time.');
      return;
    }
    try {
      await updateSession.mutateAsync({
        id,
        plannedStart: start,
        plannedEnd: end,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(id);
      router.back();
    } catch (err) {
      setError(describeError(err));
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
        <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text" numberOfLines={1}>
          {session?.lakes?.name ?? 'Session'}
        </Text>
        <Pressable
          onPress={handleDelete}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Ionicons name="trash-outline" size={18} color="#8B9184" />
        </Pressable>
      </View>

      {isLoading || !start || !end ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Starts
          </Text>
          <DateTimePicker
            value={start}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_e, d) => d && setStart(d)}
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

          <Text className="mt-2 font-label text-xs uppercase tracking-widest text-dock-text-faint">
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor="#5C6154"
            multiline
            className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />

          {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}

          <AnimatedPressable
            onPress={handleSave}
            disabled={updateSession.isPending}
            className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
          >
            {updateSession.isPending ? (
              <ActivityIndicator color="#EDEBE0" />
            ) : (
              <Text className="font-sans-semibold text-base text-dock-text">
                {saved ? 'Saved' : 'Save Changes'}
              </Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

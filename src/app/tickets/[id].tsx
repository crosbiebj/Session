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

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useDeleteTicket, useTicket, useUpdateTicket } from '@/hooks/useTickets';
import { describeError } from '@/lib/errors';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id);
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();

  const [syndicateName, setSyndicateName] = useState('');
  const [status, setStatus] = useState<'held' | 'wanted'>('wanted');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ticket) {
      setSyndicateName(ticket.syndicate_name ?? '');
      setStatus(ticket.status);
      setNotes(ticket.notes ?? '');
    }
  }, [ticket]);

  const handleSave = async () => {
    if (!ticket) return;
    setError(null);
    setSaved(false);
    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        syndicateName: syndicateName.trim() || null,
        status,
        renewalDate: ticket.renewal_date,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleDelete = () => {
    if (!ticket) return;
    Alert.alert(
      `Delete "${ticket.syndicate_name ?? 'this ticket'}"?`,
      'You can restore it later from Recently Deleted in Profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTicket.mutateAsync(ticket.id);
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
          <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
            Ticket
          </Text>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={18} color="#8B9184" />
          </Pressable>
        </View>

        {isLoading || !ticket ? (
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
              value={syndicateName}
              onChangeText={setSyndicateName}
              placeholder="Syndicate / lake name"
              placeholderTextColor="#5C6154"
              className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <View className="flex-row gap-2">
              {(['wanted', 'held'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  className={`flex-1 items-center rounded-lg py-2.5 ${
                    status === s ? 'bg-dock-moss' : 'bg-dock-panel'
                  }`}
                >
                  <Text className="font-sans-medium text-sm capitalize text-dock-text">{s}</Text>
                </Pressable>
              ))}
            </View>
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
              disabled={updateTicket.isPending}
              className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-40"
            >
              {updateTicket.isPending ? (
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

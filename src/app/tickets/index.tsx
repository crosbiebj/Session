import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useCreateTicket, useTickets } from '@/hooks/useTickets';

export default function Tickets() {
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { data: tickets, isLoading } = useTickets();
  const createTicket = useCreateTicket();
  const [showAdd, setShowAdd] = useState(add === '1');
  const [syndicateName, setSyndicateName] = useState('');
  const [status, setStatus] = useState<'held' | 'wanted'>('wanted');

  const handleAdd = async () => {
    if (!syndicateName.trim()) return;
    await createTicket.mutateAsync({
      lakeId: null,
      syndicateName: syndicateName.trim(),
      status,
      notes: null,
    });
    setSyndicateName('');
    setStatus('wanted');
    setShowAdd(false);
  };

  const addForm = (
    <View className="gap-3 border-b border-dock-border px-5 py-4">
      <TextInput
        value={syndicateName}
        onChangeText={setSyndicateName}
        placeholder="Syndicate / lake name"
        placeholderTextColor="#5C6154"
        returnKeyType="done"
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
      <AnimatedPressable
        onPress={handleAdd}
        disabled={createTicket.isPending}
        className="items-center rounded-lg bg-dock-moss py-3 disabled:opacity-60"
      >
        <Text className="font-sans-semibold text-base text-dock-text">Add Ticket</Text>
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
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#EDEBE0" />
          </Pressable>
          <Text className="font-label-semibold text-base uppercase tracking-wide text-dock-text">
            Syndicate Tickets
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
            <ActivityIndicator color="#5C7A4C" />
          </View>
        ) : (
          <FlatList
            data={tickets ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20, gap: 8 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={showAdd ? addForm : null}
            ListHeaderComponentStyle={{ marginHorizontal: -20, marginTop: -20 }}
            ListEmptyComponent={
              <Text className="font-sans text-sm text-dock-text-faint">No tickets tracked yet.</Text>
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 30)}
              >
                <Pressable
                  onPress={() => router.push(`/tickets/${item.id}`)}
                  className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5 active:opacity-70"
                >
                  <Text className="font-sans-medium text-base text-dock-text">
                    {item.syndicate_name ?? item.lakes?.name ?? 'Ticket'}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`font-label text-xs uppercase tracking-wide ${
                        item.status === 'held' ? 'text-dock-moss' : 'text-dock-amber'
                      }`}
                    >
                      {item.status}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#5C6154" />
                  </View>
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { useRestoreLake, useTrashedLakes } from '@/hooks/useLakes';
import { useRestoreSession, useTrashedSessions } from '@/hooks/useSessions';
import { useRestoreSpot, useTrashedSpots } from '@/hooks/useSpots';
import { useRestoreTicket, useTrashedTickets } from '@/hooks/useTickets';

// "Ideally have a recovery function as well... available across
// everything." One place to see anything soft-deleted and bring it
// back — the deleted_at column on each table is the actual mechanism,
// this is just where recovery lives.
function TrashSection<T extends { id: string }>({
  title,
  items,
  isLoading,
  onRestore,
  restoring,
  renderLabel,
}: {
  title: string;
  items: T[] | undefined;
  isLoading: boolean;
  onRestore: (id: string) => void;
  restoring: boolean;
  renderLabel: (item: T) => { primary: string; secondary?: string };
}) {
  if (isLoading) return null;
  if (!items || items.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="font-label text-xs uppercase tracking-widest text-dock-text-faint">
        {title}
      </Text>
      {items.map((item) => {
        const { primary, secondary } = renderLabel(item);
        return (
          <View
            key={item.id}
            className="flex-row items-center justify-between rounded-xl bg-dock-panel px-4 py-3.5"
          >
            <View className="flex-1 pr-3">
              <Text className="font-sans-medium text-base text-dock-text" numberOfLines={1}>
                {primary}
              </Text>
              {secondary ? (
                <Text className="mt-0.5 font-sans text-xs text-dock-text-faint">{secondary}</Text>
              ) : null}
            </View>
            <AnimatedPressable
              onPress={() => onRestore(item.id)}
              disabled={restoring}
              className="flex-row items-center gap-1.5 rounded-full bg-dock-moss/20 px-3 py-1.5 disabled:opacity-50"
            >
              <Ionicons name="refresh" size={13} color="#5C7A4C" />
              <Text className="font-label text-xs uppercase tracking-wide text-dock-moss">Restore</Text>
            </AnimatedPressable>
          </View>
        );
      })}
    </View>
  );
}

export default function Trash() {
  const trashedLakes = useTrashedLakes();
  const trashedSpots = useTrashedSpots();
  const trashedSessions = useTrashedSessions();
  const trashedTickets = useTrashedTickets();

  const restoreLake = useRestoreLake();
  const restoreSpot = useRestoreSpot();
  const restoreSession = useRestoreSession();
  const restoreTicket = useRestoreTicket();

  const allEmpty =
    !trashedLakes.isLoading &&
    !trashedSpots.isLoading &&
    !trashedSessions.isLoading &&
    !trashedTickets.isLoading &&
    !trashedLakes.data?.length &&
    !trashedSpots.data?.length &&
    !trashedSessions.data?.length &&
    !trashedTickets.data?.length;

  const anyLoading =
    trashedLakes.isLoading || trashedSpots.isLoading || trashedSessions.isLoading || trashedTickets.isLoading;

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
          Recently Deleted
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {anyLoading && !trashedLakes.data && !trashedSpots.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5C7A4C" />
        </View>
      ) : allEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="trash-outline" size={28} color="#5C6154" />
          <Text className="mt-3 text-center font-sans text-sm text-dock-text-faint">
            Nothing deleted recently.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <TrashSection
            title="Lakes"
            items={trashedLakes.data}
            isLoading={trashedLakes.isLoading}
            onRestore={(id) => restoreLake.mutate(id)}
            restoring={restoreLake.isPending}
            renderLabel={(l) => ({ primary: l.name })}
          />
          <TrashSection
            title="Spots"
            items={trashedSpots.data}
            isLoading={trashedSpots.isLoading}
            onRestore={(id) => restoreSpot.mutate(id)}
            restoring={restoreSpot.isPending}
            renderLabel={(s) => ({
              primary: s.name ?? s.swims?.name ?? 'Spot',
              secondary: s.lakes?.name ?? undefined,
            })}
          />
          <TrashSection
            title="Sessions"
            items={trashedSessions.data}
            isLoading={trashedSessions.isLoading}
            onRestore={(id) => restoreSession.mutate(id)}
            restoring={restoreSession.isPending}
            renderLabel={(s) => ({
              primary: s.lakes?.name ?? 'Lake TBC',
              secondary: new Date(s.planned_start).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          />
          <TrashSection
            title="Syndicate Tickets"
            items={trashedTickets.data}
            isLoading={trashedTickets.isLoading}
            onRestore={(id) => restoreTicket.mutate(id)}
            restoring={restoreTicket.isPending}
            renderLabel={(t) => ({ primary: t.syndicate_name ?? t.lakes?.name ?? 'Ticket' })}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

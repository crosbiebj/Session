import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useCreateLake, useLakes } from '@/hooks/useLakes';
import { describeError } from '@/lib/errors';
import type { Lake } from '@/types/database';

// Manual pick-from-saved-list or add-new. New lakes created here are
// personal (group_id null); picking a group lake needs a Groups UI that
// doesn't exist yet. Pinning the device's current location on a new lake
// is what lets catch-time weather auto-fill work (CLAUDE.md §3) — full
// manual map-pin-dropping and photo-EXIF GPS are still future work.
//
// variant switches the whole trigger + modal between the two design
// modes (CLAUDE.md §6a) — 'book' (warm cream) for the log-catch quick-log
// flow, 'dock' (dark) for anywhere this is embedded in Mode 2 screens
// (e.g. the Spots form) so it doesn't render as a stray cream card on a
// dark page.
export function LakePicker({
  selectedLake,
  onSelect,
  variant = 'book',
}: {
  selectedLake: Lake | null;
  onSelect: (lake: Lake | null) => void;
  variant?: 'book' | 'dock';
}) {
  const [open, setOpen] = useState(false);
  const [newLakeName, setNewLakeName] = useState('');
  // Defaults off — see lakes/index.tsx for why: a lake shouldn't get
  // geo-tagged to wherever the angler happens to be unless they say so.
  const [pinLocation, setPinLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: lakes, isLoading } = useLakes();
  const { coords, loading: locationLoading, refetch: refetchLocation } = useCurrentLocation();
  const createLake = useCreateLake();

  const handleCreate = async () => {
    if (!newLakeName.trim()) return;
    setError(null);
    try {
      const lake = await createLake.mutateAsync({
        name: newLakeName.trim(),
        latitude: pinLocation ? coords?.latitude : undefined,
        longitude: pinLocation ? coords?.longitude : undefined,
      });
      setNewLakeName('');
      onSelect(lake);
      setOpen(false);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const dock = variant === 'dock';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={
          dock
            ? 'rounded-lg bg-dock-panel px-4 py-3'
            : 'rounded-lg border border-tobacco/30 bg-white/60 px-4 py-3'
        }
      >
        <Text className={dock ? 'font-sans text-base text-dock-text' : 'font-sans text-base text-ink'}>
          {selectedLake ? selectedLake.name : 'Pick a lake (optional)'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className={dock ? 'flex-1 bg-dock-bg px-5 pt-16' : 'flex-1 bg-cream px-5 pt-16'}
        >
          <Text
            className={
              dock
                ? 'mb-4 font-label-semibold text-lg uppercase tracking-wide text-dock-text'
                : 'mb-4 font-serif text-xl text-moss'
            }
          >
            Choose a lake
          </Text>

          <FlatList
            data={lakes ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              !isLoading ? (
                <Text className={dock ? 'font-sans text-sm text-dock-text-faint' : 'font-sans text-sm text-ink/50'}>
                  No saved lakes yet.
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className={
                  dock
                    ? 'flex-row items-center justify-between border-b border-dock-border py-3'
                    : 'flex-row items-center justify-between border-b border-tobacco/15 py-3'
                }
              >
                <Text className={dock ? 'font-sans text-base text-dock-text' : 'font-sans text-base text-ink'}>
                  {item.name}
                </Text>
                {item.latitude !== null ? (
                  <Ionicons name="location" size={14} color={dock ? '#5C7A4C' : '#3D4A34'} />
                ) : null}
              </Pressable>
            )}
          />

          <View className="mt-4 gap-2">
            <Pressable
              onPress={() => {
                setPinLocation((v) => !v);
                if (!coords) refetchLocation();
              }}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons
                name={pinLocation ? 'checkbox' : 'square-outline'}
                size={16}
                color={pinLocation ? (dock ? '#5C7A4C' : '#3D4A34') : dock ? '#5C6154' : '#8B5A2B80'}
              />
              <Text className={dock ? 'font-sans text-xs text-dock-text-dim' : 'font-sans text-xs text-ink/60'}>
                Pin my current location{locationLoading ? ' (finding you…)' : ''}
              </Text>
            </Pressable>
            {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}
            <View className="flex-row gap-2">
              <TextInput
                value={newLakeName}
                onChangeText={setNewLakeName}
                placeholder="Add a new lake"
                placeholderTextColor={dock ? '#5C6154' : '#8B5A2B80'}
                className={
                  dock
                    ? 'flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text'
                    : 'flex-1 rounded-lg border border-tobacco/30 bg-white/60 px-4 py-3 font-sans text-base text-ink'
                }
              />
              <Pressable
                onPress={handleCreate}
                disabled={createLake.isPending}
                className={dock ? 'items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60' : 'items-center justify-center rounded-lg bg-moss px-5 disabled:opacity-60'}
              >
                <Text className={dock ? 'font-sans-semibold text-base text-dock-text' : 'font-sans-semibold text-base text-cream'}>
                  Add
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => setOpen(false)} className="mt-6 items-center">
            <Text className={dock ? 'font-sans text-sm text-dock-text-dim' : 'font-sans text-sm text-ink/60'}>
              Close
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useCreateSwim, useSwims } from '@/hooks/useSwims';
import type { Swim } from '@/types/database';

// Lake-scoped, mirrors LakePicker's dock variant. Disabled until a lake
// is chosen — swims only make sense relative to one lake's own naming
// scheme (e.g. Arrow Pit's "Mollie Moo's" means nothing on another lake).
export function SwimPicker({
  lakeId,
  selectedSwim,
  onSelect,
}: {
  lakeId: string | null;
  selectedSwim: Swim | null;
  onSelect: (swim: Swim | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const { data: swims, isLoading } = useSwims(lakeId);
  const createSwim = useCreateSwim();

  const handleCreate = async () => {
    if (!lakeId || !newName.trim()) return;
    const swim = await createSwim.mutateAsync({ lakeId, name: newName.trim() });
    setNewName('');
    onSelect(swim);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => lakeId && setOpen(true)}
        disabled={!lakeId}
        className={`rounded-lg bg-dock-panel px-4 py-3 ${!lakeId ? 'opacity-40' : ''}`}
      >
        <Text className="font-sans text-base text-dock-text">
          {selectedSwim ? selectedSwim.name : lakeId ? 'Pick a swim (optional)' : 'Pick a lake first'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-dock-bg px-5 pt-16">
          <Text className="mb-4 font-label-semibold text-lg uppercase tracking-wide text-dock-text">
            Choose a swim
          </Text>

          <FlatList
            data={swims ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              !isLoading ? (
                <Text className="font-sans text-sm text-dock-text-faint">
                  No swims saved for this lake yet — add the first one below.
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="border-b border-dock-border py-3"
              >
                <Text className="font-sans text-base text-dock-text">{item.name}</Text>
              </Pressable>
            )}
          />

          <View className="mt-4 flex-row gap-2">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Add a swim (e.g. Mollie Moo's)"
              placeholderTextColor="#5C6154"
              className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <Pressable
              onPress={handleCreate}
              disabled={createSwim.isPending}
              className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-60"
            >
              <Text className="font-sans-semibold text-base text-dock-text">Add</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setOpen(false)} className="mt-6 items-center">
            <Text className="font-sans text-sm text-dock-text-dim">Close</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

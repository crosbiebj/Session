import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { useLakes } from '@/hooks/useLakes';
import type { Lake } from '@/types/database';

// Filter-only lake picker — no "add new lake" here, unlike LakePicker
// (used for logging a catch). Filtering shouldn't invite creating data.
export function LakeFilterPicker({
  selectedLake,
  onSelect,
}: {
  selectedLake: Lake | null;
  onSelect: (lake: Lake | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: lakes } = useLakes();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`rounded-full border px-3 py-1.5 ${
          selectedLake ? 'border-moss bg-moss/10' : 'border-tobacco/30'
        }`}
      >
        <Text className={`font-sans text-xs ${selectedLake ? 'text-moss' : 'text-ink/60'}`}>
          {selectedLake ? selectedLake.name : 'Any lake'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-cream px-5 pt-16">
          <Text className="mb-4 font-serif text-xl text-moss">Filter by lake</Text>

          <FlatList
            data={lakes ?? []}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <Pressable
                onPress={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="border-b border-tobacco/15 py-3"
              >
                <Text className="font-sans-medium text-base text-moss">Any lake</Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="border-b border-tobacco/15 py-3"
              >
                <Text className="font-sans text-base text-ink">{item.name}</Text>
              </Pressable>
            )}
          />

          <Pressable onPress={() => setOpen(false)} className="mt-6 items-center">
            <Text className="font-sans text-sm text-ink/60">Close</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

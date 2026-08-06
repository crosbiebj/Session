import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from 'react-native';

import { useMyCatchPhotos } from '@/hooks/useCatches';

// Picks a cover photo from one of the angler's own already-logged
// catches — not a new upload, a reference. Scoped to own catches only;
// see the migration comment for why cross-angler photos are out for now.
export function TargetPhotoPicker({
  selectedPhotoId,
  selectedPhotoUrl,
  onSelect,
}: {
  selectedPhotoId: string | null;
  selectedPhotoUrl: string | null;
  onSelect: (photoId: string | null, photoUrl: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: photos, isLoading } = useMyCatchPhotos();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-3 rounded-lg bg-dock-panel p-3"
      >
        {selectedPhotoUrl ? (
          <Image source={{ uri: selectedPhotoUrl }} className="h-12 w-12 rounded-md" resizeMode="cover" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-md border border-dashed border-dock-border">
            <Ionicons name="image-outline" size={18} color="#5C6154" />
          </View>
        )}
        <Text className="flex-1 font-sans text-sm text-dock-text-dim">
          {selectedPhotoUrl ? 'Reference photo set' : 'Attach a photo from one of your catches'}
        </Text>
        {selectedPhotoId ? (
          <Pressable onPress={() => onSelect(null, null)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#5C6154" />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-dock-bg px-5 pt-16">
          <Text className="mb-4 font-label-semibold text-lg uppercase tracking-wide text-dock-text">
            Choose a photo
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#5C7A4C" />
          ) : (
            <FlatList
              data={photos ?? []}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 8 }}
              contentContainerStyle={{ gap: 8 }}
              ListEmptyComponent={
                <Text className="font-sans text-sm text-dock-text-faint">
                  No catches with photos yet — log one first.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.id, item.signedUrl);
                    setOpen(false);
                  }}
                  className="flex-1 aspect-square overflow-hidden rounded-lg"
                >
                  {item.signedUrl ? (
                    <Image source={{ uri: item.signedUrl }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full bg-dock-panel" />
                  )}
                </Pressable>
              )}
            />
          )}

          <Pressable onPress={() => setOpen(false)} className="mt-6 items-center">
            <Text className="font-sans text-sm text-dock-text-dim">Close</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

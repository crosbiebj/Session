import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = {
  uri: string;
  base64: string;
  fileExtension: string;
};

// Multi-select from the photo library — never a camera capture flow
// (CLAUDE.md §3, Home screen: "anglers take the photo on their phone
// first and add it to the app after").
export async function pickCatchPhotos(): Promise<PickedPhoto[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets
    .filter((asset) => !!asset.base64)
    .map((asset) => {
      const extensionMatch = asset.fileName?.match(/\.(\w+)$/) ?? asset.uri.match(/\.(\w+)$/);
      const fileExtension = (extensionMatch?.[1] ?? 'jpg').toLowerCase();
      return { uri: asset.uri, base64: asset.base64 as string, fileExtension };
    });
}

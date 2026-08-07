import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = {
  uri: string;
  base64: string;
  fileExtension: string;
};

// Multi-select from the photo library — never a camera capture flow
// (CLAUDE.md §3, Home screen: "anglers take the photo on their phone
// first and add it to the app after").
//
// No explicit requestMediaLibraryPermissionsAsync() pre-check —
// launchImageLibraryAsync already requests permission internally when
// needed. Doing both stacked two rounds of OS permission UI back to back
// (the request call, then the picker's own), which is what made this feel
// "excruciatingly slow" — one native round trip instead of two.
export async function pickCatchPhotos(): Promise<PickedPhoto[] | null> {
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

// Single-select, square crop — for a profile/group avatar rather than a
// catch's photo set.
export async function pickAvatarPhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) {
    return null;
  }

  const asset = result.assets[0];
  const extensionMatch = asset.fileName?.match(/\.(\w+)$/) ?? asset.uri.match(/\.(\w+)$/);
  const fileExtension = (extensionMatch?.[1] ?? 'jpg').toLowerCase();
  return { uri: asset.uri, base64: asset.base64 as string, fileExtension };
}

// A ticket's QR code screenshot — no forced crop (a syndicate's QR often
// sits above a membership number worth keeping in frame) and high
// quality, since a compressed-to-mush QR just won't scan for the
// bailiff.
export async function pickQrCodePhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.95,
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) {
    return null;
  }

  const asset = result.assets[0];
  const extensionMatch = asset.fileName?.match(/\.(\w+)$/) ?? asset.uri.match(/\.(\w+)$/);
  const fileExtension = (extensionMatch?.[1] ?? 'jpg').toLowerCase();
  return { uri: asset.uri, base64: asset.base64 as string, fileExtension };
}

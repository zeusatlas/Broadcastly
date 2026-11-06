import * as ImagePicker from 'expo-image-picker';

// Lets the person choose a square image and returns it as the multipart body the logo endpoints take
// (field "logo"), or null if they cancelled. PNG, JPEG or WebP up to 2 MB; the server checks the bytes.
export async function pickLogoForm(): Promise<FormData | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  const type = asset.mimeType ?? 'image/jpeg';
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } file descriptor rather than a Blob.
  form.append('logo', {
    uri: asset.uri,
    name: asset.fileName ?? `logo.${type.split('/')[1] ?? 'jpg'}`,
    type,
  } as unknown as Blob);
  return form;
}

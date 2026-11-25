import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Lets the member choose a photo, then resizes and compresses it on the device so uploads stay
 * small (the API accepts up to 1.5 MB). Returns a data URL, or null if cancelled.
 */
export async function pickImage({ square = true, maxSize = 1080, camera = false } = {}): Promise<string | null> {
  if (camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is needed to take a photo.');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: square, aspect: square ? [1, 1] : undefined, quality: 1 };
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  const w = asset.width || maxSize;
  const h = asset.height || maxSize;
  if (Math.max(w, h) > maxSize) ctx.resize(w >= h ? { width: maxSize } : { height: maxSize });
  const rendered = await ctx.renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!out.base64) throw new Error('Could not read the image. Please try another photo.');
  return `data:image/jpeg;base64,${out.base64}`;
}

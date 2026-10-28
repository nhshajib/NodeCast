import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseM3U } from './provider';
export async function pickPlaylist(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = Platform.OS === 'web' ? null : new File(asset.uri);
  try {
    if ((asset.size || file?.size || 0) > 400000) throw new Error('This playlist is too large for secure local import. Use its playlist URL instead.');
    const text = Platform.OS === 'web' && asset.file ? await asset.file.text() : await file!.text();
    if (text.length > 400000) throw new Error('This playlist is too large. Use a playlist URL instead.');
    if (!parseM3U(text,'https://import.invalid/').length) throw new Error('No supported streams found. Use a channel playlist containing complete HTTP/HTTPS stream URLs.');
    // A local file has no HTTP origin: relative stream paths must not turn into fake URLs.
    if (text.split(/\r\n|\r|\n/).some(line => line.trim() && !line.trim().startsWith('#') && !/^https?:\/\//i.test(line.trim()))) throw new Error('Local playlists need complete HTTP/HTTPS stream URLs. Relative paths need a playlist URL.');
    return { name: asset.name.replace(/\.m3u8?$/i,''), text };
  } finally { if (file?.exists) file.delete(); }
}

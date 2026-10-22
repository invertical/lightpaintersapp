import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import type { PickedFile } from '@/lib/form-file';
import type { Image, Picture } from '@/lib/types';

/** "3m", "5h", "2d", then a date. */
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return shortDate(iso);
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/**
 * "Sat, Nov 2 · 7:00 PM", or a date range when it spans days. In the event's own time
 * zone when it has one (a workshop in Denver reads as Denver time wherever you are).
 */
export function eventWhen(startsAt: string | null, endsAt: string | null, timeZone?: string | null) {
  if (!startsAt) return '';
  const zone = timeZone ? { timeZone } : {};
  const day = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...zone });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...zone });
  const start = new Date(startsAt);
  if (!endsAt) return `${day(start)} · ${time(start)}`;
  const end = new Date(endsAt);
  if (day(start) === day(end)) return `${day(start)} · ${time(start)}–${time(end)}`;
  return `${day(start)} – ${day(end)}`;
}

export function memberSince(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * The best variant for a box `width` points wide: the smallest JPEG/WebP at least that
 * wide (2x for sharpness), else the largest there is. The API lists variants smallest first.
 */
export function pictureUrl(picture: Pick<Picture, 'images'> | null | undefined, width: number) {
  if (!picture || picture.images.length === 0) return null;
  const want = width * 2;
  const usable = picture.images.filter((i: Image) => i.format !== 'source');
  const jpeg = usable.filter((i) => i.format === 'jpg' || i.format === 'jpeg');
  const pool = jpeg.length > 0 ? jpeg : usable;
  const sorted = [...pool].sort((a, b) => a.width - b.width);
  return (sorted.find((i) => i.width >= want) ?? sorted[sorted.length - 1])?.url ?? null;
}

/**
 * True while the server is still making a new picture's display sizes: a queued job
 * fills `images` a few seconds after the upload, so a fresh post has none yet.
 */
export function pictureProcessing(picture: Pick<Picture, 'images'>) {
  return !picture.images.some((i) => i.format !== 'source');
}

/** Open a link outside the app: web pages in the in-app browser, anything else by the OS. */
export async function openUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener');
      return;
    }
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  await Linking.openURL(url);
}

/** Pick photos from the library, as files ready for a multipart form. Empty when cancelled. */
export async function pickPhotos({ multiple = false }: { multiple?: boolean } = {}): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
    quality: 0.9,
  });
  if (result.canceled) return [];
  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
    type: a.mimeType ?? 'image/jpeg',
    file: (a as { file?: File }).file ?? null,
  }));
}

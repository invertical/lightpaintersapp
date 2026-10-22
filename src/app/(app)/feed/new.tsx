import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ImagePlus, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Button, ErrorLine, Field, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiUpload, errorMessage } from '@/lib/api';
import { pickPhotos } from '@/lib/format';
import { appendFile, type PickedFile } from '@/lib/form-file';
import { useSession } from '@/lib/session';
import type { FeedPost } from '@/lib/types';

const MAX_PICTURES = 10;

/**
 * Add a post to the feed: words, up to ten pictures, and the adult-content flag — the
 * website's feed composer (Livewire\Feed\Feed::post). Words or a picture, at least one.
 */
export default function NewPost() {
  const { token } = useSession();
  const [text, setText] = useState('');
  const [pictures, setPictures] = useState<PickedFile[]>([]);
  const [isAdult, setIsAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One per draft: a retry after a dropped connection returns the same post, never a second one.
  const clientPostId = useRef(Crypto.randomUUID());

  async function add() {
    const picked = await pickPhotos({ multiple: true });
    setPictures((prev) => [...prev, ...picked].slice(0, MAX_PICTURES));
  }

  async function post() {
    if (!text.trim() && pictures.length === 0) return setError('Write something or add a picture.');
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('text', text.trim());
      form.append('isAdult', isAdult ? '1' : '0');
      form.append('clientPostId', clientPostId.current);
      for (const p of pictures) await appendFile(form, 'pictures[]', p);
      const res = await apiUpload<{ data: FeedPost }>('/feed', form, { token });
      router.replace({ pathname: '/feed/[id]', params: { id: String(res.data.id) } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Chrome>
      <ScreenTitle title="New post" />
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Field
          label="What are you working on?"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={10000}
          placeholder="Share a light painting, a technique or news"
        />

        <View style={styles.grid}>
          {pictures.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={styles.thumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove picture"
                onPress={() => setPictures((prev) => prev.filter((_, j) => j !== i))}
                style={styles.remove}>
                <X size={14} color={Colors.foreground} />
              </Pressable>
            </View>
          ))}
          {pictures.length < MAX_PICTURES ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Add pictures" onPress={add} style={[styles.thumb, styles.add]}>
              <ImagePlus size={26} color={Colors.gold} />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={ui.muted}>Up to {MAX_PICTURES} pictures.</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Adult content</Text>
            <Text style={ui.muted}>Nudity or other content only for adults who opt in.</Text>
          </View>
          <Switch
            value={isAdult}
            onValueChange={setIsAdult}
            trackColor={{ true: Colors.gold, false: Colors.cardRaised }}
            accessibilityLabel="Adult content"
          />
        </View>

        <ErrorLine error={error} />
        <Button label="Post" onPress={post} busy={busy} disabled={!text.trim() && pictures.length === 0} />
      </ScrollView>
    </Chrome>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: Radius.md, backgroundColor: Colors.card },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  addText: { color: Colors.gold, fontSize: Font.tiny, fontWeight: '700' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { color: Colors.foreground, fontSize: Font.base, fontWeight: '600' },
});

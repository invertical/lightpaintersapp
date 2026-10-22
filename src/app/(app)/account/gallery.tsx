import { Image } from 'expo-image';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Star, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chrome } from '@/components/chrome';
import { Button, Empty, ErrorLine, ErrorState, Field, IconButton, Loading, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiFetch, apiUpload, errorMessage, type Page } from '@/lib/api';
import { pickPhotos, pictureUrl } from '@/lib/format';
import { appendFile } from '@/lib/form-file';
import { useSession } from '@/lib/session';
import type { Gallery, MyProfile, Picture, Profile } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function confirm(title: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) onYes();
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onYes },
  ]);
}

/**
 * Manage Portfolio: the pictures on my profile (my portfolio gallery, the website's
 * /account/pictures). Add, caption, mark adult, reorder, delete, and choose the profile
 * picture. Someone with no portfolio yet gets one on their first upload (POST /me/portfolio).
 */
export default function ManageGallery() {
  const { user, token } = useSession();
  const me = useApi<{ data: Profile }>(user ? `/people/${encodeURIComponent(user.username)}` : null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const galleryId = createdId ?? me.data?.data.portfolioGalleryId ?? null;
  // Listed in the gallery's own order.
  const pictures = useApi<Page<Picture>>(galleryId ? `/pictures?galleryId=${galleryId}&perPage=100` : null);
  const profile = useApi<{ data: MyProfile }>('/me/profile');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Picture | null>(null);
  const items = pictures.data?.data ?? [];

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(null);
  }

  const upload = () =>
    run('upload', async () => {
      const picked = await pickPhotos({ multiple: true });
      if (picked.length === 0) return;
      let id = galleryId;
      if (!id) {
        // 201 created, or 200 when it already exists.
        id = (await apiFetch<{ data: Gallery }>('/me/portfolio', { method: 'POST', token })).data.id;
        setCreatedId(id);
      }
      for (const file of picked) {
        const form = new FormData();
        await appendFile(form, 'file', file);
        await apiUpload(`/galleries/${id}/pictures`, form, { token });
      }
      if (galleryId) await pictures.reload();
    });

  const remove = (p: Picture) =>
    confirm('Delete this picture?', () =>
      run(`delete-${p.id}`, async () => {
        await apiFetch(`/pictures/${p.id}`, { method: 'DELETE', token });
        pictures.setData((d) => (d ? { ...d, data: d.data.filter((x) => x.id !== p.id) } : d));
      })
    );

  const move = (index: number, by: number) =>
    run('order', async () => {
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(index + by, 0, moved);
      pictures.setData((d) => (d ? { ...d, data: next } : d));
      await apiFetch(`/galleries/${galleryId}/order`, { method: 'PUT', body: { pictureIds: next.map((p) => p.id) }, token });
    });

  const makeProfilePicture = (p: Picture) =>
    run(`star-${p.id}`, async () => {
      const res = await apiFetch<{ data: MyProfile }>('/me/profile', { method: 'PATCH', body: { pictureId: p.id }, token });
      profile.setData(res);
    });

  const failed = me.error ?? pictures.error;
  const profilePictureId = profile.data?.data.pictureId;

  return (
    <Chrome>
      <ScreenTitle title="Manage Portfolio" />
      {failed ? (
        <ErrorState error={failed} onRetry={() => (me.error ? me.reload() : pictures.reload())} />
      ) : !me.data || (galleryId && !pictures.data) ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={ui.muted}>These pictures make up your portfolio. The first one leads your profile.</Text>
              <Button label="Add pictures" icon={ImagePlus} onPress={upload} busy={busy === 'upload'} />
              <ErrorLine error={error} />
            </View>
          }
          ListEmptyComponent={<Empty>No pictures yet. Add your best light painting.</Empty>}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Image source={{ uri: pictureUrl(item, 72) ?? undefined }} style={styles.thumb} contentFit="cover" />
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title || 'Untitled'}
                </Text>
                <Text style={ui.muted} numberOfLines={1}>
                  {[profilePictureId === item.id ? 'Profile picture' : null, item.isAdult ? 'Adult' : null].filter(Boolean).join(' · ') ||
                    ' '}
                </Text>
              </View>
              <View style={styles.actions}>
                <IconButton
                  icon={Star}
                  label="Use as profile picture"
                  size={18}
                  color={profilePictureId === item.id ? Colors.gold : Colors.muted}
                  onPress={() => makeProfilePicture(item)}
                />
                <IconButton icon={ArrowUp} label="Move up" size={18} color={index === 0 ? Colors.border : Colors.muted} onPress={() => index > 0 && move(index, -1)} />
                <IconButton
                  icon={ArrowDown}
                  label="Move down"
                  size={18}
                  color={index === items.length - 1 ? Colors.border : Colors.muted}
                  onPress={() => index < items.length - 1 && move(index, 1)}
                />
                <IconButton icon={Pencil} label="Edit picture" size={18} color={Colors.muted} onPress={() => setEditing(item)} />
                <IconButton icon={Trash2} label="Delete picture" size={18} color={Colors.danger} onPress={() => remove(item)} />
              </View>
            </View>
          )}
        />
      )}
      <EditPicture
        picture={editing}
        onClose={() => setEditing(null)}
        onSaved={(p) => pictures.setData((d) => (d ? { ...d, data: d.data.map((x) => (x.id === p.id ? p : x)) } : d))}
      />
    </Chrome>
  );
}

function EditPicture({ picture, onClose, onSaved }: { picture: Picture | null; onClose: () => void; onSaved: (p: Picture) => void }) {
  return (
    <Modal visible={!!picture} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        {picture ? <EditPictureForm key={picture.id} picture={picture} onClose={onClose} onSaved={onSaved} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

function EditPictureForm({ picture, onClose, onSaved }: { picture: Picture; onClose: () => void; onSaved: (p: Picture) => void }) {
  const { token } = useSession();
  const [title, setTitle] = useState(picture.title ?? '');
  const [description, setDescription] = useState(picture.description ?? '');
  const [isAdult, setIsAdult] = useState(picture.isAdult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Picture }>(`/pictures/${picture.id}`, {
        method: 'PATCH',
        body: { title: title.trim() || null, description: description.trim() || null, isAdult },
        token,
      });
      onSaved(res.data);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <View style={styles.formHead}>
        <Text style={styles.formTitle}>Edit picture</Text>
        <IconButton icon={X} label="Close" onPress={onClose} />
      </View>
      <Image source={{ uri: pictureUrl(picture, 300) ?? undefined }} style={styles.preview} contentFit="contain" />
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={255} />
      <Field label="Description" value={description} onChangeText={setDescription} multiline />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Adult content</Text>
        <Switch value={isAdult} onValueChange={setIsAdult} trackColor={{ true: Colors.gold, false: Colors.cardRaised }} accessibilityLabel="Adult content" />
      </View>
      <ErrorLine error={error} />
      <Button label="Save" onPress={save} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: Spacing.xxl },
  header: { padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: Colors.card },
  text: { flex: 1 },
  title: { color: Colors.foreground, fontSize: Font.sm, fontWeight: '700' },
  actions: { flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { maxHeight: '90%', backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  form: { padding: Spacing.lg, gap: Spacing.md },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  preview: { width: '100%', height: 200, backgroundColor: Colors.background, borderRadius: Radius.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: Colors.foreground, fontSize: Font.base },
});

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, MapPin, MessageCircle, Pencil, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chrome } from '@/components/chrome';
import { LinkChips } from '@/components/link-chips';
import { Lightbox, PictureGrid } from '@/components/picture-grid';
import { Avatar, Button, Chip, ErrorLine, ErrorState, IconButton, Loading, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage, type Page } from '@/lib/api';
import { memberSince, pictureUrl } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Chat, Picture, Profile, TagApplication } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useMeasuredWidth } from '@/lib/use-measured-width';

/**
 * A profile, after the website's phone layout (lightpainters.com/{username}): the lead
 * picture, name, Message (or Edit profile on your own), location, links, posts and tags,
 * groups, the bio (three lines, then View more), and the portfolio.
 */
export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useApi<{ data: Profile }>(`/people/${encodeURIComponent(username)}`);
  const p = profile.data?.data;
  const pictures = useApi<Page<Picture>>(p?.portfolioGalleryId ? `/pictures?galleryId=${p.portfolioGalleryId}&perPage=60` : null);

  return (
    <Chrome>
      <ScreenTitle title={p?.name ?? 'Profile'} />
      {profile.error ? (
        <ErrorState error={profile.error} onRetry={profile.reload} />
      ) : !p ? (
        <Loading />
      ) : (
        <ProfileBody profile={p} pictures={pictures.data?.data ?? []} picturesLoading={pictures.loading} />
      )}
    </Chrome>
  );
}

function ProfileBody({ profile: p, pictures, picturesLoading }: { profile: Profile; pictures: Picture[]; picturesLoading: boolean }) {
  const { user, token } = useSession();
  const { width, onLayout } = useMeasuredWidth();
  const mine = p.isMe ?? user?.id === p.id;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [bioClipped, setBioClipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ONE slideshow, as on the website: the chosen profile picture leads it, then the
  // portfolio without it. No profile picture: no lead, and the avatar stands in.
  const lead = p.profilePicture ?? null;
  const portfolio = lead ? pictures.filter((x) => x.id !== lead.id) : pictures;
  const slides = lead ? [lead, ...portfolio] : portfolio;
  const tags = p.tags.filter((t) => t.status === 'approved');

  async function message() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Chat }>('/me/chats/direct', { method: 'POST', body: { userId: p.id }, token });
      router.push({ pathname: '/messages/[id]', params: { id: String(res.data.id) } });
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View onLayout={onLayout} />
      {lead ? (
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`View ${p.name}'s pictures`} onPress={() => setLightbox(0)}>
          <Image
            source={{ uri: pictureUrl(lead, width) ?? undefined }}
            style={{ width, height: Math.min(width * 1.1, (width * lead.height) / (lead.width || 1)), backgroundColor: Colors.card }}
            contentFit="cover"
            transition={150}
          />
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <View style={styles.identity}>
          {!lead ? <Avatar url={p.avatarUrl} size={72} square /> : null}
          <View style={styles.names}>
            <Text style={styles.name} accessibilityRole="header">
              {p.name}
            </Text>
            {p.otherName ? <Text style={ui.muted}>{p.otherName}</Text> : null}
            <Text style={ui.muted}>@{p.username}</Text>
          </View>
          {mine ? (
            <Button label="Edit profile" icon={Pencil} size="sm" variant="secondary" onPress={() => router.push('/account/profile')} />
          ) : p.canMessage !== false ? (
            <Button label="Message" icon={MessageCircle} size="sm" variant="secondary" busy={busy} onPress={message} />
          ) : null}
        </View>
        <ErrorLine error={error} />

        {p.location ? (
          <View style={styles.line}>
            <MapPin size={16} color={Colors.muted} />
            <Text style={ui.muted}>{p.location}</Text>
          </View>
        ) : null}
        {p.isMember ? (
          <View style={styles.line}>
            <BadgeCheck size={16} color={Colors.gold} />
            <Text style={ui.muted}>{p.memberSince ? `Member since ${memberSince(p.memberSince)}` : 'Member'}</Text>
          </View>
        ) : null}

        <LinkChips links={p.links} />

        <View style={styles.line}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/people/[username]/posts', params: { username: p.username } })}>
            <Text style={ui.link}>{p.feedPostCount === undefined ? 'Feed posts' : `${p.feedPostCount} feed post${p.feedPostCount === 1 ? '' : 's'}`}</Text>
          </Pressable>
          {tags.length > 0 ? (
            <>
              <Text style={ui.muted}>•</Text>
              <Pressable accessibilityRole="button" onPress={() => setTagsOpen(true)}>
                <Text style={ui.link}>Artist Tags</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {p.orgs && p.orgs.length > 0 ? (
        <View style={styles.orgs}>
          {p.orgs.map((org) => (
            <Pressable
              key={org.id}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/orgs/[slug]', params: { slug: org.slug } })}
              style={({ pressed }) => [styles.org, pressed && styles.pressed]}>
              <Text style={styles.orgText} numberOfLines={2}>
                {org.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {p.description ? (
        <View style={styles.section}>
          <Text
            style={ui.body}
            numberOfLines={bioOpen ? undefined : 3}
            onTextLayout={(e) => !bioOpen && setBioClipped(e.nativeEvent.lines.length >= 3)}>
            {p.description}
          </Text>
          {bioClipped && !bioOpen ? (
            <Pressable accessibilityRole="button" onPress={() => setBioOpen(true)} style={styles.viewMore}>
              <Text style={styles.viewMoreText}>View more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, styles.section]} accessibilityRole="header">
        Portfolio
      </Text>
      {picturesLoading ? (
        <Loading />
      ) : portfolio.length === 0 ? (
        <Text style={[ui.muted, styles.section]}>No pictures yet.</Text>
      ) : (
        <PictureGrid pictures={portfolio} />
      )}

      <Lightbox pictures={slides} index={lightbox} onIndex={setLightbox} />
      <TagsSheet name={p.name} tags={tags} open={tagsOpen} onClose={() => setTagsOpen(false)} />
    </ScrollView>
  );
}

/** The profile's tags, by vocabulary, in a sheet (the website's phone layout). */
function TagsSheet({ name, tags, open, onClose }: { name: string; tags: TagApplication[]; open: boolean; onClose: () => void }) {
  const groups = new Map<string, string[]>();
  for (const t of tags) {
    const key = t.tag.type.name;
    groups.set(key, [...(groups.get(key) ?? []), t.role ? `${t.tag.name} (${t.role})` : t.tag.name]);
  }
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">{`${name}'s tags`}</Text>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {[...groups.entries()].map(([type, names]) => (
            <View key={type} style={styles.tagGroup}>
              <Text style={styles.tagType}>{type}</Text>
              <View style={styles.chips}>
                {names.map((n) => (
                  <Chip key={n} label={n} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.lg },
  section: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  names: { flex: 1, gap: 2 },
  name: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800' },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  orgs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  org: {
    width: '48.5%',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.cardRaised,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  orgText: { color: Colors.foreground, fontSize: Font.sm, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  viewMore: { alignSelf: 'center', paddingVertical: Spacing.xs },
  viewMoreText: { color: Colors.foreground, fontSize: Font.sm, fontWeight: '600', textDecorationLine: 'underline' },
  sectionTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { maxHeight: '80%', backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: Spacing.lg, paddingTop: Spacing.sm },
  sheetTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  sheetBody: { padding: Spacing.lg, gap: Spacing.lg },
  tagGroup: { gap: Spacing.sm },
  tagType: { color: Colors.muted, fontSize: Font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});

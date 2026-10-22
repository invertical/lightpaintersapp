import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Avatar } from '@/components/ui';
import { Colors, Font, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { pictureUrl, timeAgo } from '@/lib/format';
import type { FeedPost, Person, Picture } from '@/lib/types';

export function openProfile(person: Pick<Person, 'username'>) {
  router.push({ pathname: '/people/[username]', params: { username: person.username } });
}

/** Who posted, linking to their profile, and when. */
export function AuthorRow({ person, when, size = 40 }: { person: Person; when?: string; size?: number }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${person.name}'s profile`}
      onPress={() => openProfile(person)}
      style={styles.author}>
      <Avatar url={person.avatarUrl} size={size} />
      <View style={styles.authorText}>
        <Text style={styles.authorName} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.authorMeta} numberOfLines={1}>
          @{person.username}
          {when ? ` · ${timeAgo(when)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/** One or more pictures, full width; several swipe sideways with a counter. */
export function PictureCarousel({ pictures, width }: { pictures: Picture[]; width: number }) {
  const [index, setIndex] = useState(0);
  if (pictures.length === 0) return null;
  const heightFor = (p: Picture) => Math.min(width * 1.25, (width * (p.height || 1)) / (p.width || 1));
  const height = Math.max(...pictures.map(heightFor));

  return (
    <View>
      <FlatList
        data={pictures}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p.id)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image
            source={{ uri: pictureUrl(item, width) ?? undefined }}
            style={{ width, height, backgroundColor: Colors.card }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={item.title ?? item.description ?? 'Light painting'}
          />
        )}
      />
      {pictures.length > 1 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>{`${index + 1} / ${pictures.length}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * A feed post: the author (to their profile), the pictures, the words, its tags, and the
 * comment count (to the post and its comments). `full` shows the whole text.
 */
export function FeedPostCard({ post, full = false }: { post: FeedPost; full?: boolean }) {
  const { width: window } = useWindowDimensions();
  const width = Math.min(window, MaxContentWidth);
  const open = () => router.push({ pathname: '/feed/[id]', params: { id: String(post.id) } });
  const tags = post.tags.filter((t) => t.status === 'approved');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AuthorRow person={post.author} when={post.createdAt} />
      </View>
      <PictureCarousel pictures={post.pictures} width={width} />
      <Pressable onPress={full ? undefined : open} disabled={full} style={styles.body} accessibilityRole={full ? undefined : 'link'}>
        {post.subject ? <Text style={styles.subject}>{post.subject}</Text> : null}
        {post.text ? (
          <Text style={styles.text} numberOfLines={full ? undefined : 4}>
            {post.text}
          </Text>
        ) : null}
        {post.processingLevel ? <Text style={styles.meta}>{post.processingLevel.label}</Text> : null}
        {tags.length > 0 ? (
          <Text style={styles.tags} numberOfLines={full ? undefined : 2}>
            {tags.map((t) => t.tag.name).join(' · ')}
          </Text>
        ) : null}
      </Pressable>
      {!full ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${post.commentCount} comments. Open the post`}
          onPress={open}
          style={styles.actions}>
          <MessageSquare size={18} color={Colors.muted} />
          <Text style={styles.actionText}>
            {post.commentCount === 0 ? 'Comment' : `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  head: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, alignSelf: 'flex-start' },
  authorText: { flexShrink: 1 },
  authorName: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700' },
  authorMeta: { color: Colors.muted, fontSize: Font.tiny },
  counter: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  counterText: { color: Colors.foreground, fontSize: Font.tiny, fontWeight: '600' },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xs },
  subject: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  text: { color: Colors.foreground, fontSize: Font.base, lineHeight: 22 },
  meta: { color: Colors.muted, fontSize: Font.tiny },
  tags: { color: Colors.gold, fontSize: Font.tiny },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  actionText: { color: Colors.muted, fontSize: Font.sm, fontWeight: '600' },
});

import { router, useLocalSearchParams } from 'expo-router';
import { SendHorizontal, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { AuthorRow, FeedPostCard } from '@/components/feed-post-card';
import { PagedList } from '@/components/paged-list';
import { ErrorLine, ErrorState, IconButton, Loading, ScreenTitle } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { pictureProcessing } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Comment, FeedPost } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** One feed post with its comments, oldest first, and a box to add one. */
export default function FeedPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const post = useApi<{ data: FeedPost }>(`/feed/${id}`);
  const comments = usePaged<Comment>(`/feed/${id}/comments`, {}, 20);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A post opened right after it was made has pictures still processing on the server:
  // look again every 2 seconds until they're ready, for up to a minute.
  const tries = useRef(0);
  const processing = post.data?.data.pictures.some(pictureProcessing) ?? false;
  const { reload } = post;
  useEffect(() => {
    if (!processing || tries.current >= 30) return;
    const timer = setTimeout(() => {
      tries.current += 1;
      reload();
    }, 2000);
    return () => clearTimeout(timer);
  }, [processing, post.data, reload]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: Comment }>(`/feed/${id}/comments`, { method: 'POST', body: { text: body }, token });
      setText('');
      comments.setItems((prev) => [...prev, res.data]);
      post.setData((p) => (p ? { data: { ...p.data, commentCount: p.data.commentCount + 1 } } : p));
    } catch (e) {
      setError(errorMessage(e));
    }
    setSending(false);
  }

  async function remove(comment: Comment) {
    const go = async () => {
      try {
        await apiFetch(`/feed/${id}/comments/${comment.id}`, { method: 'DELETE', token });
        comments.setItems((prev) => prev.filter((c) => c.id !== comment.id));
        post.setData((p) => (p ? { data: { ...p.data, commentCount: Math.max(0, p.data.commentCount - 1) } } : p));
      } catch (e) {
        setError(errorMessage(e));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this comment?')) go();
      return;
    }
    Alert.alert('Delete this comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  }

  return (
    <Chrome bottomBar={false}>
      <ScreenTitle title="Post" />
      {post.error ? (
        <ErrorState error={post.error} onRetry={post.reload} />
      ) : !post.data ? (
        <Loading />
      ) : (
        <>
          <View style={styles.fill}>
            <PagedList
              list={comments}
              header={
                <>
                  <FeedPostCard post={post.data.data} full onRemoved={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
                  <Text style={styles.heading}>
                    {post.data.data.commentCount === 1 ? '1 comment' : `${post.data.data.commentCount} comments`}
                  </Text>
                </>
              }
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  <View style={styles.commentHead}>
                    <AuthorRow person={item.author} when={item.createdAt} size={32} />
                    {item.canDelete ? <IconButton icon={Trash2} label="Delete comment" size={18} color={Colors.muted} onPress={() => remove(item)} /> : null}
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              )}
              empty="No comments yet. Be the first."
            />
          </View>
          <ErrorLine error={error} />
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment"
              placeholderTextColor={Colors.muted}
              style={styles.input}
              multiline
              maxLength={5000}
              accessibilityLabel="Add a comment"
            />
            <IconButton
              icon={SendHorizontal}
              label="Post comment"
              color={text.trim() && !sending ? Colors.gold : Colors.muted}
              onPress={send}
            />
          </View>
        </>
      )}
    </Chrome>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  heading: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700', padding: Spacing.lg, paddingBottom: Spacing.sm },
  comment: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs },
  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentText: { color: Colors.foreground, fontSize: Font.base, lineHeight: 22, paddingLeft: 44 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.foreground,
    fontSize: Font.base,
  },
});

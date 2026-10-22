import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { SendHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Avatar, ErrorLine, ErrorState, IconButton, Loading, ScreenTitle } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Chat, ChatMessage } from '@/lib/types';
import { useChatsUnread } from '@/lib/unread';
import { useApi } from '@/lib/use-api';

const POLL_MS = 8_000;

type MessagesPage = { data: ChatMessage[]; meta: { hasMore: boolean; nextBefore: number | null } };

/**
 * One conversation. Newest at the bottom; older ones load as you scroll up. New messages
 * arrive by checking every few seconds while the screen is open. Sending is safe to retry
 * (clientMessageId).
 */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const badge = useChatsUnread();
  const chat = useApi<{ data: Chat }>(`/me/chats/${id}`);
  // Newest first, as the API sends them and as the inverted list wants them.
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [before, setBefore] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pending = useRef<string | null>(null);
  // What is on screen, for the poll to compare against without re-subscribing.
  const shown = useRef<ChatMessage[] | null>(null);
  useEffect(() => {
    shown.current = messages;
  }, [messages]);

  const markRead = useCallback(() => {
    apiFetch<{ unreadThreads: number }>(`/me/chats/${id}/read`, { method: 'POST', token })
      .then((r) => badge.setUnread(r.unreadThreads))
      .catch(() => {});
  }, [id, token, badge]);

  /** The newest page, merged over what is shown (new ones on top, nothing lost below). */
  const loadLatest = useCallback(async () => {
    try {
      const res = await apiFetch<MessagesPage>(`/me/chats/${id}/messages?limit=50`, { token });
      const prev = shown.current;
      if (!prev) {
        setBefore(res.meta.nextBefore);
        setMessages(res.data);
        return;
      }
      const known = new Set(prev.map((m) => m.id));
      const fresh = res.data.filter((m) => !known.has(m.id));
      if (fresh.length > 0) {
        setMessages((current) => [...fresh.filter((m) => !current?.some((c) => c.id === m.id)), ...(current ?? [])]);
        markRead();
      }
    } catch (e) {
      setError((prev: unknown) => prev ?? e);
    }
  }, [id, token, markRead]);

  useEffect(() => {
    loadLatest().then(markRead);
    let timer: ReturnType<typeof setInterval> | null = setInterval(loadLatest, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !timer) {
        loadLatest();
        timer = setInterval(loadLatest, POLL_MS);
      } else if (state !== 'active' && timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per conversation
  }, [id]);

  async function loadOlder() {
    if (!before || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await apiFetch<MessagesPage>(`/me/chats/${id}/messages?limit=50&before=${before}`, { token });
      setMessages((prev) => [...(prev ?? []), ...res.data]);
      setBefore(res.meta.nextBefore);
    } catch {}
    setLoadingOlder(false);
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    // The same id on a retry, so a message is never sent twice.
    pending.current ??= Crypto.randomUUID();
    setSending(true);
    setSendError(null);
    try {
      const res = await apiFetch<{ data: ChatMessage }>(`/me/chats/${id}/messages`, {
        method: 'POST',
        body: { body, clientMessageId: pending.current },
        token,
      });
      pending.current = null;
      setText('');
      setMessages((prev) => (prev?.some((m) => m.id === res.data.id) ? prev : [res.data, ...(prev ?? [])]));
    } catch (e) {
      setSendError(errorMessage(e));
    }
    setSending(false);
  }

  const other = chat.data?.data.with;
  const canPost = chat.data?.data.canPost !== false;

  return (
    <Chrome bottomBar={false}>
      <ScreenTitle
        title={other?.name ?? 'Conversation'}
        right={
          other ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${other.name}'s profile`}
              onPress={() => router.push({ pathname: '/people/[username]', params: { username: other.username } })}>
              <Avatar url={other.avatarUrl} size={32} />
            </Pressable>
          ) : null
        }
      />
      {error && !messages ? (
        <ErrorState error={error} onRetry={loadLatest} />
      ) : !messages ? (
        <Loading />
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => String(m.id)}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.list}
          ListFooterComponent={loadingOlder ? <ActivityIndicator color={Colors.gold} style={styles.older} /> : undefined}
          ListEmptyComponent={<Text style={styles.empty}>Say hello.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender.isMine ? styles.mine : styles.theirs]}>
              <Text style={[styles.body, item.sender.isMine && styles.mineText]}>{item.body}</Text>
              <Text style={[styles.time, item.sender.isMine && styles.mineTime]}>{timeAgo(item.createdAt)}</Text>
            </View>
          )}
        />
      )}
      <ErrorLine error={sendError} />
      {canPost ? (
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            multiline
            maxLength={10000}
            accessibilityLabel="Message"
          />
          <IconButton icon={SendHorizontal} label="Send" color={text.trim() && !sending ? Colors.gold : Colors.muted} onPress={send} />
        </View>
      ) : (
        <Text style={styles.blocked}>You blocked this person. Unblock them to reply.</Text>
      )}
    </Chrome>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  older: { padding: Spacing.md },
  empty: { color: Colors.muted, textAlign: 'center', padding: Spacing.xl, transform: [{ scaleY: -1 }] },
  bubble: { maxWidth: '80%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: Colors.cardRaised, borderBottomLeftRadius: 4 },
  body: { color: Colors.foreground, fontSize: Font.base, lineHeight: 21 },
  mineText: { color: Colors.onGold },
  time: { color: Colors.muted, fontSize: 10, alignSelf: 'flex-end' },
  mineTime: { color: Colors.onGold, opacity: 0.7 },
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
  blocked: { color: Colors.muted, textAlign: 'center', padding: Spacing.lg },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { PagedList } from '@/components/paged-list';
import { Avatar, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { timeAgo } from '@/lib/format';
import type { Chat } from '@/lib/types';
import { useChatsUnread } from '@/lib/unread';
import { usePaged } from '@/lib/use-api';

/** My conversations, most recent first. Start one from a person's profile (Message). */
export default function Inbox() {
  const list = usePaged<Chat>('/me/chats', {}, 30);
  const badge = useChatsUnread();
  const { refresh } = list;

  // Back from a conversation: its unread count has changed.
  useFocusEffect(
    useCallback(() => {
      refresh();
      badge.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- once per focus
    }, [])
  );

  return (
    <Chrome>
      <ScreenTitle title="Messages" />
      <PagedList
        list={list}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => {
          const unread = item.unreadCount > 0;
          return (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${unread ? `${item.unreadCount} unread from ` : ''}${item.with?.name ?? 'Conversation'}`}
              onPress={() => router.push({ pathname: '/messages/[id]', params: { id: String(item.id) } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Avatar url={item.with?.avatarUrl} size={48} />
              <View style={styles.text}>
                <View style={styles.head}>
                  <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>
                    {item.with?.name ?? 'Conversation'}
                  </Text>
                  <Text style={styles.when}>{timeAgo(item.lastActivityAt)}</Text>
                </View>
                <Text style={[ui.muted, unread && styles.preview]} numberOfLines={1}>
                  {item.lastMessage ? `${item.lastMessage.sender.isMine ? 'You: ' : ''}${item.lastMessage.body}` : 'No messages yet'}
                </Text>
              </View>
              {unread ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
        empty="No conversations yet. Open someone's profile and tap Message."
      />
    </Chrome>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  pressed: { backgroundColor: Colors.card },
  text: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  name: { flex: 1, color: Colors.foreground, fontSize: Font.base },
  bold: { fontWeight: '700' },
  when: { color: Colors.muted, fontSize: Font.tiny },
  preview: { color: Colors.foreground },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
});

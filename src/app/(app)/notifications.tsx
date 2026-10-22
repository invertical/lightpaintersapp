import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { PagedList } from '@/components/paged-list';
import { ScreenTitle, TextButton, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { openUrl, timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { AppNotification } from '@/lib/types';
import { useNotificationsUnread } from '@/lib/unread';
import { usePaged } from '@/lib/use-api';

/**
 * Where a notification's website link goes in the app: a profile, a feed post, an org or
 * a conversation have screens here; anything else opens in the browser.
 */
function openTarget(url: string | null) {
  if (!url) return;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return;
  }
  const feed = path.match(/^\/feed\/(\d+)/);
  if (feed) return router.push({ pathname: '/feed/[id]', params: { id: feed[1] } });
  const chat = path.match(/^\/messages\/(\d+)/);
  if (chat) return router.push({ pathname: '/messages/[id]', params: { id: chat[1] } });
  const org = path.match(/^\/groups\/([a-z0-9-]+)\/?$/);
  if (org && org[1] !== 'new') return router.push({ pathname: '/orgs/[slug]', params: { slug: org[1] } });
  const person = path.match(/^\/([A-Za-z0-9_.-]+)\/?$/);
  if (person) return router.push({ pathname: '/people/[username]', params: { username: person[1] } });
  openUrl(url);
}

/** My notifications, newest first. Opening one marks it read; Mark all read clears the badge. */
export default function Notifications() {
  const { token } = useSession();
  const list = usePaged<AppNotification>('/me/notifications', {}, 25);
  const badge = useNotificationsUnread();

  async function open(n: AppNotification) {
    if (!n.read) {
      list.setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      badge.setUnread(Math.max(0, (badge.unread ?? 1) - 1));
      apiFetch(`/me/notifications/${n.id}`, { method: 'PATCH', body: { read: true }, token }).catch(() => {});
    }
    openTarget(n.url);
  }

  async function readAll() {
    list.setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    badge.setUnread(0);
    await apiFetch('/me/notifications/read-all', { method: 'POST', token }).catch(() => badge.refresh());
  }

  return (
    <Chrome>
      <ScreenTitle title="Notifications" right={badge.unread ? <TextButton label="Mark all read" onPress={readAll} /> : null} />
      <PagedList
        list={list}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}`}
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}>
            <View style={styles.icon}>
              <Bell size={18} color={item.read ? Colors.muted : Colors.gold} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, !item.read && styles.titleUnread]}>{item.title}</Text>
              {item.body ? (
                <Text style={ui.muted} numberOfLines={3}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={styles.when}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
        empty="No notifications yet."
      />
    </Chrome>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    alignItems: 'flex-start',
  },
  unread: { backgroundColor: Colors.card },
  pressed: { opacity: 0.7 },
  icon: { paddingTop: 2 },
  text: { flex: 1, gap: 3 },
  title: { color: Colors.foreground, fontSize: Font.base },
  titleUnread: { fontWeight: '700' },
  when: { color: Colors.muted, fontSize: Font.tiny },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold, marginTop: 8 },
});

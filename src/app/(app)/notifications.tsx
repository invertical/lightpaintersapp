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

/** The website's own one-segment paths (routes/web.php), which are never usernames. */
const SITE_PAGES = new Set([
  'login', 'logout', 'create-account', 'forgot-password', 'verify-email', 'artists', 'groups', 'tags', 'people',
  'galleries', 'pictures', 'events', 'links', 'feed', 'membership', 'sponsors', 'donate', 'checkout', 'images',
  'tutorials', 'pages', 'sitemap.xml', 'account', 'messages', 'notifications', 'admin', 'about', 'terms',
  'privacy', 'cookies', 'kaleidoscopes', 'group-shoot-etiquette',
]);

/**
 * Where a notification goes in the app: its `link` when the API names one, else its
 * website URL — a profile, a feed post, an org or a conversation have screens here;
 * anything else opens in the browser.
 */
function openTarget(n: AppNotification) {
  // A comment on my post (type "feed_comment"). Tag requests ("tag_requests") and
  // everything else follow their URL: tag approval is on the website for now.
  if (n.link?.kind === 'feed_post' && n.link.id) {
    return router.push({ pathname: '/feed/[id]', params: { id: String(n.link.id) } });
  }
  const url = n.url;
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
  if (/^\/messages\/?$/.test(path)) return router.push('/messages');
  if (/^\/feed\/?$/.test(path)) return router.push('/feed');
  // lightpainters.com/{username} — but not one of the site's own top-level pages.
  const person = path.match(/^\/([A-Za-z0-9_.-]+)\/?$/);
  if (person && !SITE_PAGES.has(person[1].toLowerCase())) {
    return router.push({ pathname: '/people/[username]', params: { username: person[1] } });
  }
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
    openTarget(n);
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

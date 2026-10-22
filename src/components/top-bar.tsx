import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Bell, MessageCircle, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openTab } from '@/components/bottom-bar';
import { Avatar, Badge, IconButton } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { useChatsUnread, useNotificationsUnread } from '@/lib/unread';

const MENU: { label: string; href: (username: string) => Href }[] = [
  { label: 'View profile', href: (username) => ({ pathname: '/people/[username]', params: { username } }) },
  { label: 'Manage profile', href: () => '/account/profile' },
  { label: 'Manage Portfolio', href: () => '/account/gallery' },
  { label: 'My feed posts', href: (username) => ({ pathname: '/people/[username]/posts', params: { username } }) },
  { label: 'Settings', href: () => '/settings' },
  { label: 'About', href: () => '/about' },
];

/**
 * The signed-in top bar. Left: the logo and the LightPainters word mark (text until there
 * is a word-mark graphic), both to the feed, reloaded and unfiltered like the Feed tab. Right, from the far edge in: the profile
 * picture (its menu), messages, notifications, then + for a new feed post.
 */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useSession();
  const notifications = useNotificationsUnread();
  const chats = useChatsUnread();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (href: Href) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.xs }]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="LightPainters home"
        onPress={() => openTab('feed')}
        style={styles.brand}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.wordmark} numberOfLines={1}>
          LightPainters
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <IconButton icon={Plus} label="New feed post" onPress={() => router.navigate('/feed/new')} />
        <View>
          <IconButton
            icon={Bell}
            label={`Notifications${notifications.unread ? `, ${notifications.unread} new` : ''}`}
            onPress={() => router.navigate('/notifications')}
          />
          <Badge count={notifications.unread} />
        </View>
        <View>
          <IconButton
            icon={MessageCircle}
            label={`Messages${chats.unread ? `, ${chats.unread} unread` : ''}`}
            onPress={() => router.navigate('/messages')}
          />
          <Badge count={chats.unread} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your account menu"
          onPress={() => setMenuOpen(true)}
          hitSlop={6}
          style={styles.me}>
          <Avatar url={user?.avatarUrl} size={32} />
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu">
          <View style={[styles.menu, { top: insets.top + 52 }]}>
            {user ? (
              <View style={styles.menuHead}>
                <Text style={styles.menuName} numberOfLines={1}>
                  {`${user.firstName} ${user.lastName}`.trim()}
                </Text>
                <Text style={styles.menuUser} numberOfLines={1}>
                  @{user.username}
                </Text>
              </View>
            ) : null}
            {MENU.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => user && go(item.href(user.username))}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}>
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => {
                setMenuOpen(false);
                signOut();
              }}
              style={({ pressed }) => [styles.menuItem, styles.menuLast, pressed && styles.menuPressed]}>
              <Text style={[styles.menuText, styles.logout]}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1, minHeight: 44 },
  logo: { width: 26, height: 31 },
  wordmark: { color: Colors.gold, fontSize: Font.lg, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  me: { marginLeft: Spacing.xs, padding: 2, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.gold },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu: {
    position: 'absolute',
    right: Spacing.md,
    width: 230,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuHead: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  menuName: { color: Colors.foreground, fontWeight: '700', fontSize: Font.base },
  menuUser: { color: Colors.muted, fontSize: Font.tiny },
  menuItem: { minHeight: 44, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  menuLast: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  menuPressed: { backgroundColor: Colors.cardRaised },
  menuText: { color: Colors.foreground, fontSize: Font.base },
  logout: { color: Colors.danger },
});

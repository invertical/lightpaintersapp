import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Chrome } from '@/components/chrome';
import { MenuRow } from '@/components/menu-row';
import { Button, ScreenTitle } from '@/components/ui';
import { API_URL, SITE_URL } from '@/constants/api';
import { Colors, Font, Spacing } from '@/constants/theme';
import { openUrl } from '@/lib/format';
import { useSession } from '@/lib/session';

/**
 * Settings: the account at a glance, the profile screens, and the account pages that are
 * still website-only (password and security, email preferences).
 */
export default function Settings() {
  const { user, signOut } = useSession();

  return (
    <Chrome>
      <ScreenTitle title="Settings" />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.group}>Account</Text>
        <MenuRow label="Name" value={user ? `${user.firstName} ${user.lastName}`.trim() : null} />
        <MenuRow label="Username" value={user ? `@${user.username}` : null} />
        <MenuRow label="Email" value={user?.email ?? 'None'} />
        {user?.phoneNumber ? <MenuRow label="Phone" value={user.phoneNumber} /> : null}

        <Text style={styles.group}>Profile</Text>
        <MenuRow label="Manage profile" onPress={() => router.push('/account/profile')} />
        <MenuRow label="Manage Portfolio" onPress={() => router.push('/account/gallery')} />

        <Text style={styles.group}>On the website</Text>
        <MenuRow label="Password and security" external onPress={() => openUrl(`${SITE_URL}/account/security`)} />
        <MenuRow label="Email preferences" external onPress={() => openUrl(`${SITE_URL}/account/preferences`)} />

        <Button label="Log out" variant="danger" onPress={signOut} style={styles.logout} />
        <Text style={styles.version}>
          {`Version ${Constants.expoConfig?.version ?? '1.0.0'}${__DEV__ ? ` · ${API_URL}` : ''}`}
        </Text>
      </ScrollView>
    </Chrome>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: Spacing.xxl },
  group: {
    color: Colors.muted,
    fontSize: Font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  logout: { margin: Spacing.lg, marginTop: Spacing.xxl },
  version: { color: Colors.muted, fontSize: Font.tiny, textAlign: 'center' },
});

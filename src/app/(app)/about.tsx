import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { MenuRow } from '@/components/menu-row';
import { ScreenTitle, ui } from '@/components/ui';
import { SITE_URL } from '@/constants/api';
import { Colors, Font, Spacing } from '@/constants/theme';
import { openUrl } from '@/lib/format';

const PAGES = [
  { label: 'About LightPainters', path: '/about' },
  { label: 'Group shoot etiquette', path: '/group-shoot-etiquette' },
  { label: 'Terms of use', path: '/terms' },
  { label: 'Privacy policy', path: '/privacy' },
];

/** About: who we are, and the website's fixed pages. */
export default function About() {
  return (
    <Chrome>
      <ScreenTitle title="About" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.wordmark}>LightPainters</Text>
          <Text style={[ui.body, styles.center]}>
            A home for light painting artists: find artists near you, share your work in the feed, and keep up
            with workshops, meetups and performances.
          </Text>
        </View>
        {PAGES.map((p) => (
          <MenuRow key={p.path} label={p.label} external onPress={() => openUrl(`${SITE_URL}${p.path}`)} />
        ))}
        <Text style={styles.version}>{`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}</Text>
      </ScrollView>
    </Chrome>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  logo: { width: 80, height: 96 },
  wordmark: { color: Colors.gold, fontSize: Font.xxl, fontWeight: '800' },
  center: { textAlign: 'center' },
  version: { color: Colors.muted, fontSize: Font.tiny, textAlign: 'center', marginTop: Spacing.xl },
});

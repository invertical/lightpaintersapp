import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';

/** Signed out: the logo, then Log in or Create account. */
export default function Welcome() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="LightPainters logo"
        />
        <Text style={styles.wordmark} accessibilityRole="header">
          LightPainters
        </Text>
        <Text style={styles.tagline}>The community for light painting artists, groups and events.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Log in" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'log-in' } })} />
        <Button
          label="Create an account"
          variant="secondary"
          onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'create' } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  logo: { width: 150, height: 179 },
  wordmark: { color: Colors.gold, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: Colors.muted, fontSize: Font.base, textAlign: 'center', maxWidth: 300 },
  actions: { gap: Spacing.md, width: '100%', maxWidth: 420, alignSelf: 'center', paddingBottom: Spacing.lg },
});

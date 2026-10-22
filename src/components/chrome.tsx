import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { BottomBar } from '@/components/bottom-bar';
import { TopBar } from '@/components/top-bar';
import { Colors, MaxContentWidth } from '@/constants/theme';

/**
 * A pushed screen inside the signed-in app: the same top and bottom bars as the tabs,
 * with the screen between them (centred and capped in width on tablets and the web).
 * `bottomBar={false}` for screens with their own composer at the bottom (a conversation).
 */
export function Chrome({ children, bottomBar = true }: { children: ReactNode; bottomBar?: boolean }) {
  return (
    <View style={styles.page}>
      <TopBar />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.column}>{children}</View>
      </KeyboardAvoidingView>
      {bottomBar ? <BottomBar /> : null}
    </View>
  );
}

/** The width cap alone, for tab screens (the tab navigator draws the bars). */
export function Column({ children }: { children: ReactNode }) {
  return (
    <View style={styles.page}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});

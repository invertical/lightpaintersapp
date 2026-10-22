import type { ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { TopBar } from '@/components/top-bar';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useTabReset } from '@/lib/tab-reset';

/**
 * A pushed screen inside the signed-in app: the same top and bottom bars as the tabs,
 * with the screen between them (centred and capped in width on tablets and the web).
 * `bottomBar={false}` for screens with their own composer at the bottom (a conversation);
 * the screen then keeps clear of the system navigation bar itself.
 */
export function Chrome({ children, bottomBar = true }: { children: ReactNode; bottomBar?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, !bottomBar && { paddingBottom: insets.bottom }]}>
      <TopBar />
      {/* Padding on Android too: edge-to-edge stops the window resizing for the keyboard. */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={styles.column}>{children}</View>
      </KeyboardAvoidingView>
      {bottomBar ? <BottomBar /> : null}
    </View>
  );
}

/**
 * The width cap alone, for tab screens (the tab navigator draws the bars). With `tab`, the
 * screen remounts each time that tab is pressed (openTab), back at its top.
 */
export function Column({ children, tab }: { children: ReactNode; tab?: string }) {
  const reset = useTabReset(tab ?? '');
  return (
    <View style={styles.page}>
      <View key={reset} style={styles.column}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});

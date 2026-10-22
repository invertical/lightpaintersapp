import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';
import { ChatsUnreadProvider, NotificationsUnreadProvider } from '@/lib/unread';

SplashScreen.preventAutoHideAsync();

// Dark only, like the website's default theme.
const NavTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.background, card: Colors.background, primary: Colors.gold },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={NavTheme}>
        <SessionProvider>
          <NotificationsUnreadProvider>
            <ChatsUnreadProvider>
              <RootNavigator />
            </ChatsUnreadProvider>
          </NotificationsUnreadProvider>
        </SessionProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Signed out: the welcome screen and sign-in. Signed in without a confirmed email: the
 * email step (every account needs one). Otherwise: the app.
 */
function RootNavigator() {
  const { token, isLoading, needsEmail } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // Keep the native splash screen up until the stored token has been checked.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={!!token && !needsEmail}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!token && needsEmail}>
        <Stack.Screen name="confirm-email" />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

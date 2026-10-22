import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { SignInFlow } from '@/features/sign-in/sign-in-flow';

/**
 * Log in and Create account share one flow, the website's: the server decides from the
 * email, phone or username whether this is someone new (its sign-up step).
 */
export default function SignIn() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <SafeAreaView style={styles.page}>
      <SignInFlow
        mode={mode === 'create' ? 'create' : 'log-in'}
        onExit={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
});

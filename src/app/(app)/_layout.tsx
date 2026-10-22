import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** The signed-in app: the five tabs, with every other screen pushed over them. */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />;
}

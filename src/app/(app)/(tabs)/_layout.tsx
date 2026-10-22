import { Tabs } from 'expo-router';

import { BottomBar } from '@/components/bottom-bar';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';

/** Artists, Organizations, Feed, Links, Events, under the shared top bar. Feed is home: `/` redirects to it. */
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ header: () => <TopBar />, sceneStyle: { backgroundColor: Colors.background } }}
      tabBar={({ state }) => <BottomBar active={state.routes[state.index]?.name} />}>
      <Tabs.Screen name="artists" />
      <Tabs.Screen name="organizations" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="links" />
      <Tabs.Screen name="events" />
    </Tabs>
  );
}

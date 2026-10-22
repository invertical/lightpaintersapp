import { router, usePathname, type Href } from 'expo-router';
import { Building2, CalendarDays, Link2, Newspaper, Palette, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { resetTab } from '@/lib/tab-reset';

/** `filters`: the tab's search params, emptied when the tab is pressed. */
export const TABS: { name: string; href: string; label: string; icon: LucideIcon; filters?: string[] }[] = [
  {
    name: 'artists',
    href: '/artists',
    label: 'Artists',
    icon: Palette,
    filters: ['searched', 'q', 'country', 'role', 'technique', 'subject', 'sort'],
  },
  { name: 'organizations', href: '/organizations', label: 'Organizations', icon: Building2 },
  { name: 'feed', href: '/feed', label: 'Feed', icon: Newspaper, filters: ['tag', 'level'] },
  { name: 'events', href: '/events', label: 'Events', icon: CalendarDays },
  { name: 'links', href: '/links', label: 'Links', icon: Link2 },
];

/**
 * A tab from the top, unfiltered and freshly loaded — also when it is already on screen.
 * Empty params replace the filter's; the reset remounts the screen.
 */
export function openTab(name: string) {
  const tab = TABS.find((t) => t.name === name);
  if (!tab) return;
  resetTab(tab.name);
  const params = Object.fromEntries((tab.filters ?? []).map((key) => [key, '']));
  router.navigate({ pathname: tab.href, params } as Href);
}

/**
 * The five-link bottom bar. The tab navigator draws it under its screens; pushed screens
 * (a profile, an org) draw it too, so it is always there. Pressing a tab navigates to its
 * href, which switches tabs, or goes back down the stack to the tab from a pushed screen.
 * Every tab lands on its top, unfiltered and reloaded (openTab).
 */
export function BottomBar({ active }: { active?: string }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const current = active ?? TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.name === current;
        const color = selected ? Colors.gold : Colors.muted;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => openTab(tab.name)}
            style={styles.tab}>
            <Icon size={22} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 44, justifyContent: 'center' },
  label: { fontSize: 10.5, fontWeight: '600' },
});

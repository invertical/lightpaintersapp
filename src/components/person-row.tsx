import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { openProfile } from '@/components/feed-post-card';
import { Avatar } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import type { Person } from '@/lib/types';

/** One person in a list, to their profile. */
export function PersonRow({ person, detail }: { person: Person; detail?: string | null }) {
  const place = detail ?? [person.city, person.country].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${person.name}'s profile`}
      onPress={() => openProfile(person)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar url={person.avatarUrl} size={48} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          @{person.username}
          {place ? ` · ${place}` : ''}
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 64,
  },
  pressed: { backgroundColor: Colors.card },
  text: { flex: 1 },
  name: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700' },
  meta: { color: Colors.muted, fontSize: Font.tiny },
});

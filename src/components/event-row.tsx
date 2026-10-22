import { Image } from 'expo-image';
import { CalendarDays, ExternalLink } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { eventWhen, openUrl } from '@/lib/format';
import type { EventItem } from '@/lib/types';

/** One event; a tap opens its page in the browser (its own site when it has one). */
export function EventRow({ event }: { event: EventItem }) {
  const where = event.online ? 'Online' : [event.venue, event.city, event.country].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Opens in your browser"
      onPress={() => openUrl(event.url || event.pageUrl)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <CalendarDays size={24} color={Colors.muted} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.when}>{eventWhen(event.startsAt, event.endsAt)}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {event.name}
        </Text>
        {event.subtitle ? (
          <Text style={styles.meta} numberOfLines={1}>
            {event.subtitle}
          </Text>
        ) : null}
        {where ? (
          <Text style={styles.meta} numberOfLines={1}>
            {where}
          </Text>
        ) : null}
      </View>
      <ExternalLink size={16} color={Colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  pressed: { backgroundColor: Colors.card },
  image: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.card },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  when: { color: Colors.gold, fontSize: Font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  name: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700' },
  meta: { color: Colors.muted, fontSize: Font.tiny },
});

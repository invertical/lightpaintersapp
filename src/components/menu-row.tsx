import { ChevronRight, ExternalLink } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Font, Spacing } from '@/constants/theme';

/** A row in a settings-style list: a label, an optional value, and where it goes. */
export function MenuRow({
  label,
  value,
  onPress,
  external,
}: {
  label: string;
  value?: string | null;
  onPress?: () => void;
  external?: boolean;
}) {
  const Icon = external ? ExternalLink : ChevronRight;
  return (
    <Pressable
      accessibilityRole={onPress ? (external ? 'link' : 'button') : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {value ? (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon size={16} color={Colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.card },
  text: { flex: 1, gap: 2 },
  label: { color: Colors.foreground, fontSize: Font.base },
  value: { color: Colors.muted, fontSize: Font.sm },
});

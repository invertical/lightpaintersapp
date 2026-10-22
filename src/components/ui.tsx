/**
 * The app's small building blocks: buttons, fields, states, avatar, badge. Lucide icons
 * only and no emoji in copy (the website's design rule).
 */
import { Image } from 'expo-image';
import { ChevronLeft, UserRound, type LucideIcon } from 'lucide-react-native';
import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';

import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, disabled, busy, icon: Icon, variant = 'primary', size = 'md', style }: ButtonProps) {
  const fg = variant === 'primary' ? Colors.onGold : variant === 'danger' ? Colors.danger : Colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.secondary,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {Icon ? <Icon size={size === 'sm' ? 14 : 18} color={fg} /> : null}
          <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={styles.textButton} hitSlop={6}>
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  size = 22,
  color = Colors.foreground,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon size={size} color={color} />
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string; ref?: Ref<TextInput> };

export function Field({ label, error, hint, style, multiline, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputInvalid, style]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function ErrorLine({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorLine}>
      {error}
    </Text>
  );
}

export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator color={Colors.gold} />
    </View>
  );
}

/** A failed load, with a retry. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.stateText}>{errorMessage(error)}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" size="sm" onPress={onRetry} style={styles.stateButton} /> : null}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={styles.center}>
      <Text style={styles.stateText}>{children}</Text>
    </View>
  );
}

export function Avatar({ url, size = 40, square }: { url: string | null | undefined; size?: number; square?: boolean }) {
  const radius = square ? Radius.md : size / 2;
  if (!url) {
    return (
      <View style={[styles.avatarEmpty, { width: size, height: size, borderRadius: radius }]}>
        <UserRound size={size * 0.55} color={Colors.muted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: Colors.cardRaised }}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
}

/** A count on an icon; hidden at zero, "9+" past nine. */
export function Badge({ count }: { count: number | null | undefined }) {
  if (!count) return null;
  return (
    <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, onPress, selected }: { label: string; onPress?: () => void; selected?: boolean }) {
  const body = <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>;
  if (!onPress) return <View style={[styles.chip, selected && styles.chipSelected]}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {body}
    </Pressable>
  );
}

/** A pushed screen's title row, with Back. */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <IconButton
        icon={ChevronLeft}
        label="Back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
      />
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.titleRight}>{right}</View>
    </View>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.heading} accessibilityRole="header">
        {children}
      </Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  body: { color: Colors.foreground, fontSize: Font.base, lineHeight: Font.base * 1.45 },
  muted: { color: Colors.muted, fontSize: Font.sm },
  link: { color: Colors.gold, fontSize: Font.sm, fontWeight: '600' },
  page: { padding: Spacing.lg, gap: Spacing.lg },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
});

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonSm: { minHeight: 34, paddingHorizontal: Spacing.lg },
  primary: { backgroundColor: Colors.gold },
  secondary: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  buttonText: { fontSize: Font.base, fontWeight: '700' },
  buttonTextSm: { fontSize: Font.sm },
  textButton: { alignSelf: 'center', paddingVertical: Spacing.sm },
  textButtonText: { color: Colors.muted, fontSize: Font.sm, textDecorationLine: 'underline', textAlign: 'center' },
  iconButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6 },
  label: {
    color: Colors.muted,
    fontSize: Font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.foreground,
    fontSize: Font.base,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  inputInvalid: { borderColor: Colors.danger },
  fieldError: { color: Colors.danger, fontSize: Font.tiny },
  hint: { color: Colors.muted, fontSize: Font.tiny },
  errorLine: { color: Colors.danger, fontSize: Font.sm, textAlign: 'center' },
  center: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  stateText: { color: Colors.muted, fontSize: Font.sm, textAlign: 'center' },
  stateButton: { marginTop: Spacing.md },
  avatarEmpty: { backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: { color: Colors.onGold, fontSize: 10, fontWeight: '800' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardRaised,
  },
  chipSelected: { backgroundColor: Colors.gold },
  chipText: { color: Colors.foreground, fontSize: Font.tiny, fontWeight: '600' },
  chipTextSelected: { color: Colors.onGold },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { flex: 1, color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  titleRight: { minWidth: 40, alignItems: 'flex-end', paddingRight: Spacing.sm },
  heading: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800', letterSpacing: -0.3 },
});

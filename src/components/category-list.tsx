import { ChevronRight, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Empty, ErrorState, Heading, Loading, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

type Category = { slug: string; name: string; description?: string | null; count?: number };

/**
 * The Links and Events tabs: a heading, a Submit button, and their four categories as
 * cards, each to its list.
 */
export function CategoryList({
  title,
  lede,
  submitLabel,
  onSubmit,
  categories,
  loading,
  error,
  onRetry,
  countNoun,
  onOpen,
  footer,
}: {
  title: string;
  lede: string;
  submitLabel: string;
  onSubmit: () => void;
  categories: Category[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  countNoun: string;
  onOpen: (slug: string) => void;
  footer?: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Heading>{title}</Heading>
      <Text style={ui.muted}>{lede}</Text>
      <Button label={submitLabel} icon={Plus} size="sm" variant="secondary" onPress={onSubmit} style={styles.submit} />
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <View style={styles.list}>
          {categories.map((c) => (
            <Pressable
              key={c.slug}
              accessibilityRole="link"
              onPress={() => onOpen(c.slug)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.text}>
                <Text style={styles.name}>{c.name}</Text>
                {c.description ? (
                  <Text style={ui.muted} numberOfLines={2}>
                    {c.description}
                  </Text>
                ) : null}
                {c.count !== undefined ? <Text style={styles.count}>{`${c.count} ${countNoun}`}</Text> : null}
              </View>
              <ChevronRight size={20} color={Colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  submit: { alignSelf: 'flex-start' },
  list: { gap: Spacing.md, marginTop: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: 84,
  },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 4 },
  name: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  count: { color: Colors.gold, fontSize: Font.tiny, fontWeight: '700' },
});

import { router } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Column } from '@/components/chrome';
import { PagedList } from '@/components/paged-list';
import { Avatar, Button, Heading, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import type { Org } from '@/lib/types';
import { usePaged } from '@/lib/use-api';

/**
 * Organizations: a header, Add an organization, then every org A to Z.
 */
export default function Organizations() {
  const list = usePaged<Org>('/groups', { sort: 'name' }, 100);
  const sorted = useMemo(() => [...list.items].sort((a, b) => a.name.localeCompare(b.name)), [list.items]);

  return (
    <Column tab="organizations">
      <PagedList
        list={{ ...list, items: sorted }}
        header={
          <View style={styles.header}>
            <Heading>Organizations</Heading>
            <Text style={ui.muted}>Groups, collectives and communities of light painters.</Text>
            <Button
              label="Add an organization"
              icon={Plus}
              size="sm"
              variant="secondary"
              onPress={() => router.push('/orgs/new')}
              style={styles.add}
            />
          </View>
        }
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/orgs/[slug]', params: { slug: item.slug } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Avatar url={item.logoUrl} size={48} square />
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.memberCount !== undefined ? (
                <Text style={ui.muted}>{`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}</Text>
              ) : null}
            </View>
            <ChevronRight size={18} color={Colors.muted} />
          </Pressable>
        )}
        empty="No organizations yet."
      />
    </Column>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  add: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  pressed: { backgroundColor: Colors.card },
  text: { flex: 1, gap: 2 },
  name: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700' },
});

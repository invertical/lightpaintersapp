import { router, useLocalSearchParams } from 'expo-router';
import { ExternalLink, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { PagedList } from '@/components/paged-list';
import { IconButton, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { openUrl } from '@/lib/format';
import type { DirectoryLink, LinkSection } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** One section's links, as the website lists them. A tap opens the link in the browser. */
export default function LinkSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const sections = useApi<{ data: LinkSection[] }>('/link-sections');
  const current = sections.data?.data.find((s) => s.slug === section);
  const list = usePaged<DirectoryLink>('/links', { section }, 50);

  return (
    <Chrome>
      <ScreenTitle
        title={current?.name ?? 'Links'}
        right={
          <IconButton
            icon={Plus}
            label="Submit a link"
            onPress={() => router.push({ pathname: '/links/submit', params: { section } })}
          />
        }
      />
      <PagedList
        list={list}
        header={current?.description ? <Text style={[ui.muted, styles.lede]}>{current.description}</Text> : null}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            accessibilityHint="Opens in your browser"
            onPress={() => openUrl(item.url)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.text}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? (
                <Text style={ui.muted} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={styles.url} numberOfLines={1}>
                {item.url.replace(/^https?:\/\/(www\.)?/, '')}
              </Text>
            </View>
            <ExternalLink size={16} color={Colors.muted} />
          </Pressable>
        )}
        empty="No links in this section yet."
      />
    </Chrome>
  );
}

const styles = StyleSheet.create({
  lede: { padding: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.card },
  text: { flex: 1, gap: 3 },
  name: { color: Colors.foreground, fontSize: Font.base, fontWeight: '700' },
  url: { color: Colors.gold, fontSize: Font.tiny },
});

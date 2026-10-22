import { router } from 'expo-router';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Select, type Option } from '@/components/select';
import { Chip, Label } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import type { Tag } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** The website's FeedPost::PROCESSING_LEVELS; -1 is "Any". */
export const LEVELS: Option<number>[] = [
  { value: 0, label: 'Straight out of camera' },
  { value: 10, label: 'Levels and curves, one exposure' },
  { value: 20, label: 'Spot editing, one exposure' },
  { value: 30, label: 'Live composite' },
  { value: 40, label: 'Layered composite or significant editing' },
  { value: 50, label: 'Not Light Painting' },
];
const ANY = -1;
const LEVEL_CHOICES: Option<number>[] = [{ value: ANY, label: 'Any' }, ...LEVELS];

const GROUPS = [
  { type: 'techniques', label: 'Tools and Techniques' },
  { type: 'subjects', label: 'Subjects' },
];

/** The feed's filter, kept in the address: `tag` (ids, comma-separated, all must match) and `level`. */
export type FeedFilter = { tags: number[]; level: number | null };

export function parseFeedFilter(params: { tag?: string; level?: string }): FeedFilter {
  const tags = (params.tag ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const level = params.level !== undefined && params.level !== '' && Number.isInteger(Number(params.level)) ? Number(params.level) : null;
  return { tags, level };
}

function setFilter(next: FeedFilter) {
  router.setParams({ tag: next.tags.length > 0 ? next.tags.join(',') : undefined, level: next.level === null ? undefined : String(next.level) });
}

/** A tag on a post: the feed filtered to that tag alone (the website's tag links). */
export function filterFeedByTag(tagId: number) {
  router.navigate({ pathname: '/feed', params: { tag: String(tagId) } });
}

/**
 * The top of the feed, after the website's /feed: Filter opens the ten tags used most on
 * posts in each vocabulary (More for the rest) and "How it was made". Chosen filters show
 * as chips that remove themselves, with Clear.
 */
export function FeedFilters({ filter }: { filter: FeedFilter }) {
  const [open, setOpen] = useState(false);
  const active = filter.tags.length > 0 || filter.level !== null;

  const toggleTag = (id: number) =>
    setFilter({ ...filter, tags: filter.tags.includes(id) ? filter.tags.filter((t) => t !== id) : [...filter.tags, id] });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => [styles.toggle, (open || pressed) && styles.toggleOn]}>
          <SlidersHorizontal size={16} color={Colors.foreground} />
          <Text style={styles.toggleText}>Filter</Text>
        </Pressable>
        {filter.tags.map((id) => (
          <ActiveTag key={id} id={id} onRemove={() => toggleTag(id)} />
        ))}
        {filter.level !== null ? (
          <Remove label={LEVELS.find((l) => l.value === filter.level)?.label ?? 'How it was made'} onPress={() => setFilter({ ...filter, level: null })} />
        ) : null}
        {active ? (
          <Pressable accessibilityRole="button" onPress={() => setFilter({ tags: [], level: null })} hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={styles.panel}>
          {GROUPS.map((g) => (
            <TagGroup key={g.type} type={g.type} label={g.label} chosen={filter.tags} onToggle={toggleTag} />
          ))}
          <Select
            label="How it was made"
            value={filter.level ?? ANY}
            options={LEVEL_CHOICES}
            onChange={(v) => setFilter({ ...filter, level: v === ANY ? null : v })}
          />
        </View>
      ) : null}
    </View>
  );
}

/** One vocabulary's tags, most used on feed posts first: ten, then More pages on. */
function TagGroup({ type, label, chosen, onToggle }: { type: string; label: string; chosen: number[]; onToggle: (id: number) => void }) {
  const tags = usePaged<Tag>('/feed/tags', { type }, 10);
  return (
    <View style={styles.group}>
      <Label>{label}</Label>
      <View style={styles.chips}>
        {tags.items.map((t) => (
          <Chip
            key={t.id}
            label={t.useCount ? `${t.name} ${t.useCount}` : t.name}
            selected={chosen.includes(t.id)}
            onPress={() => onToggle(t.id)}
          />
        ))}
        {tags.error ? <Text style={styles.muted}>Couldn’t load these tags.</Text> : null}
        {tags.loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {!tags.loading && !tags.done && tags.items.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`More ${label}`} onPress={tags.loadMore} hitSlop={8}>
            <Text style={styles.more}>More</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** A chosen tag as a chip; its name is looked up, since the address holds only ids. */
function ActiveTag({ id, onRemove }: { id: number; onRemove: () => void }) {
  const tag = useApi<{ data: Tag }>(`/tags/${id}`);
  return <Remove label={tag.data?.data.name ?? '…'} onPress={onRemove} />;
}

function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove filter ${label}`} onPress={onPress} style={styles.active}>
      <Text style={styles.activeText} numberOfLines={1}>
        {label}
      </Text>
      <X size={12} color={Colors.onGold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  toggleOn: { backgroundColor: Colors.card },
  toggleText: { color: Colors.foreground, fontSize: Font.sm, fontWeight: '600' },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 240,
    backgroundColor: Colors.gold,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  activeText: { color: Colors.onGold, fontSize: Font.tiny, fontWeight: '600', flexShrink: 1 },
  clear: { color: Colors.muted, fontSize: Font.tiny, textDecorationLine: 'underline' },
  panel: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.lg },
  group: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  muted: { color: Colors.muted, fontSize: Font.tiny },
  more: { color: Colors.muted, fontSize: Font.tiny, textDecorationLine: 'underline' },
});

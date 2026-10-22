import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Column } from '@/components/chrome';
import { PagedList } from '@/components/paged-list';
import { PersonRow } from '@/components/person-row';
import { Select, type Option } from '@/components/select';
import { Button, Chip, Empty, ErrorState, Field, Heading, Loading, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import type { Country, Person, Tag } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** The three dropdowns behind "More filters" — on the website, checkbox groups. */
const VOCABULARIES = [
  { param: 'role', type: 'roles', label: 'Roles' },
  { param: 'technique', type: 'techniques', label: 'Tools and techniques' },
  { param: 'subject', type: 'subjects', label: 'Subjects' },
] as const;

type SortKey = 'name' | 'created' | 'lastAccess';

const SORTS: Option<SortKey>[] = [
  { value: 'name', label: 'Name' },
  { value: 'created', label: 'Newest members' },
  { value: 'lastAccess', label: 'Recently active' },
];

type Params = { q?: string; country?: string; role?: string; technique?: string; subject?: string; sort?: string; searched?: string };

/** "All" is the empty value in every dropdown. */
const ALL = 0;

function useFilterOptions() {
  // Only countries that have artists in them (requested of the API: ?withArtists=1).
  const countries = useApi<{ data: Country[] }>('/countries?withArtists=1');
  const roles = useApi<{ data: Tag[] }>('/tags?type=roles&perPage=100');
  const techniques = useApi<{ data: Tag[] }>('/tags?type=techniques&perPage=100');
  const subjects = useApi<{ data: Tag[] }>('/tags?type=subjects&perPage=100');
  const tags = { roles, techniques, subjects };
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  return {
    countries: [
      { value: ALL, label: 'Anywhere' },
      ...(countries.data?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ] as Option<number>[],
    tags: (type: keyof typeof tags) =>
      [
        { value: ALL, label: 'All' },
        ...[...(tags[type].data?.data ?? [])].sort(byName).map((t) => ({ value: t.id, label: t.name })),
      ] as Option<number>[],
  };
}

/**
 * Artists: a small search (name, country), more filters on request (roles, tools and
 * techniques, subjects — one pick each), sort, and Search. Before a search, the twelve
 * newest members. A search puts its choices in the URL; the results page shows them with
 * Reset, and loads 20 at a time as you scroll.
 */
export default function Artists() {
  const params = useLocalSearchParams<Params>();
  const options = useFilterOptions();
  return (
    <Column>{params.searched ? <Results params={params} options={options} /> : <SearchForm options={options} />}</Column>
  );
}

function SearchForm({ options }: { options: ReturnType<typeof useFilterOptions> }) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState<number>(ALL);
  const [more, setMore] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>({ role: ALL, technique: ALL, subject: ALL });
  const [sort, setSort] = useState<SortKey>('name');
  const newest = useApi<{ data: Person[] }>('/people?sort=created&perPage=12');

  const search = () => {
    const chosen = (n: number) => (n === ALL ? undefined : String(n));
    router.setParams({
      searched: '1',
      q: q.trim() || undefined,
      country: chosen(country),
      role: chosen(picked.role),
      technique: chosen(picked.technique),
      subject: chosen(picked.subject),
      sort,
    });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <Heading>Find artists</Heading>
      <View style={styles.form}>
        <Field
          label="Name"
          value={q}
          onChangeText={setQ}
          placeholder="Name or username"
          returnKeyType="search"
          onSubmitEditing={search}
          autoCorrect={false}
        />
        <Select label="Country" value={country} options={options.countries} onChange={setCountry} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: more }}
          onPress={() => setMore((m) => !m)}
          style={styles.more}>
          <Text style={ui.link}>{more ? 'Fewer filters' : 'More filters'}</Text>
          {more ? <ChevronUp size={16} color={Colors.gold} /> : <ChevronDown size={16} color={Colors.gold} />}
        </Pressable>
        {more
          ? VOCABULARIES.map((v) => (
              <Select
                key={v.param}
                label={v.label}
                value={picked[v.param]}
                options={options.tags(v.type)}
                onChange={(value) => setPicked((p) => ({ ...p, [v.param]: value }))}
              />
            ))
          : null}

        <Select label="Sort by" value={sort} options={SORTS} onChange={setSort} />
        <Button label="Search" icon={Search} onPress={search} />
      </View>

      <Heading style={styles.newHeading}>New Members</Heading>
      {newest.error ? (
        <ErrorState error={newest.error} onRetry={newest.reload} />
      ) : !newest.data ? (
        <Loading />
      ) : newest.data.data.length === 0 ? (
        <Empty>No members yet.</Empty>
      ) : (
        <View style={styles.list}>
          {newest.data.data.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Results({ params, options }: { params: Params; options: ReturnType<typeof useFilterOptions> }) {
  const sort = (SORTS.find((s) => s.value === params.sort)?.value ?? 'name') as SortKey;
  const tag = [params.role, params.technique, params.subject].filter(Boolean) as string[];
  const list = usePaged<Person>('/people', { q: params.q, countryId: params.country, tag, sort }, 20);

  const label = (opts: Option<number>[], id?: string) => (id ? opts.find((o) => String(o.value) === id)?.label ?? `#${id}` : null);
  const chosen = [
    params.q ? `“${params.q}”` : null,
    label(options.countries, params.country),
    ...VOCABULARIES.map((v) => label(options.tags(v.type), params[v.param])),
  ].filter(Boolean) as string[];

  const reset = () =>
    router.setParams({
      searched: undefined,
      q: undefined,
      country: undefined,
      role: undefined,
      technique: undefined,
      subject: undefined,
      sort: undefined,
    });

  return (
    <PagedList
      list={list}
      header={
        <View style={styles.summary}>
          <View style={styles.summaryHead}>
            <Text style={styles.summaryTitle} accessibilityRole="header">
              {list.total === null ? 'Searching…' : `${list.total} artist${list.total === 1 ? '' : 's'}`}
            </Text>
            <Button label="Reset" icon={RotateCcw} size="sm" variant="secondary" onPress={reset} />
          </View>
          <View style={styles.chips}>
            {chosen.length === 0 ? <Chip label="Everyone" /> : chosen.map((c) => <Chip key={c} label={c} />)}
          </View>
          <Select label="Sort by" value={sort} options={SORTS} onChange={(value) => router.setParams({ sort: value })} />
        </View>
      }
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <PersonRow person={item} />}
      empty="No artists match. Try fewer filters."
    />
  );
}

const styles = StyleSheet.create({
  page: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  form: {
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', minHeight: 36 },
  newHeading: { marginTop: Spacing.sm },
  list: { marginHorizontal: -Spacing.lg },
  summary: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  summaryTitle: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});

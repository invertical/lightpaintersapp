import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { Chrome } from '@/components/chrome';
import { EventRow } from '@/components/event-row';
import { PagedList } from '@/components/paged-list';
import { IconButton, ScreenTitle, ui } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { EventItem, EventType } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** One kind of event, upcoming first. A tap opens the event in the browser. */
export default function EventTypeScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const types = useApi<{ data: EventType[] }>('/event-types');
  const current = types.data?.data.find((t) => t.slug === type);
  const list = usePaged<EventItem>('/events', { type }, 20);

  return (
    <Chrome>
      <ScreenTitle
        title={current?.name ?? 'Events'}
        right={
          <IconButton
            icon={Plus}
            label="Submit an event"
            onPress={() => router.push({ pathname: '/events/new', params: { type } })}
          />
        }
      />
      <PagedList
        list={list}
        header={current?.description ? <Text style={[ui.muted, styles.lede]}>{current.description}</Text> : null}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => <EventRow event={item} />}
        empty="Nothing coming up. Know of something? Submit it."
      />
    </Chrome>
  );
}

const styles = StyleSheet.create({
  lede: { padding: Spacing.lg },
});

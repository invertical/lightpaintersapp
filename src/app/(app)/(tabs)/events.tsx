import { router } from 'expo-router';

import { CategoryList } from '@/components/category-list';
import { Column } from '@/components/chrome';
import type { EventType } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Events: workshops, meetups, performances and opportunities, and Submit an event. */
export default function Events() {
  const types = useApi<{ data: EventType[] }>('/event-types');
  return (
    <Column>
      <CategoryList
        title="Events"
        lede="Workshops, meetups, performances and opportunities around the world."
        submitLabel="Submit an event"
        onSubmit={() => router.push('/events/new')}
        categories={(types.data?.data ?? []).map((t) => ({
          slug: t.slug,
          name: t.name,
          description: t.description,
          count: t.upcomingCount,
        }))}
        loading={types.loading}
        error={types.error}
        onRetry={types.reload}
        countNoun="upcoming"
        onOpen={(slug) => router.push({ pathname: '/events/type/[type]', params: { type: slug } })}
      />
    </Column>
  );
}

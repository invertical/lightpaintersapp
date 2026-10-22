import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Column } from '@/components/chrome';
import { FeedFilters, parseFeedFilter } from '@/components/feed-filters';
import { FeedPostCard } from '@/components/feed-post-card';
import { PagedList } from '@/components/paged-list';
import { usePaged } from '@/lib/use-api';
import type { FeedPost } from '@/lib/types';

/**
 * Home: the feed, newest first, loading more as you scroll. Filter at the top narrows it
 * by tags and how it was made (`?tag=1,2&level=30`, like the website's /feed). Every
 * reload (a filter change or pull to refresh) starts the Filter panel closed.
 */
export default function Feed() {
  const filter = parseFeedFilter(useLocalSearchParams<{ tag?: string; level?: string }>());
  const filtered = filter.tags.length > 0 || filter.level !== null;
  const list = usePaged<FeedPost>('/feed', { tag: filter.tags, level: filter.level }, 10);
  const [refreshes, setRefreshes] = useState(0);
  const refresh = () => {
    setRefreshes((n) => n + 1);
    list.refresh();
  };
  return (
    <Column>
      <PagedList
        list={{ ...list, refresh }}
        header={<FeedFilters key={`${filter.tags.join(',')}|${filter.level}|${refreshes}`} filter={filter} />}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <FeedPostCard post={item} onRemoved={(id) => list.setItems((prev) => prev.filter((p) => p.id !== id))} />}
        empty={filtered ? 'No posts match these filters.' : 'Nothing in the feed yet.'}
      />
    </Column>
  );
}

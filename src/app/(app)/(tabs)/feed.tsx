import { Column } from '@/components/chrome';
import { FeedPostCard } from '@/components/feed-post-card';
import { PagedList } from '@/components/paged-list';
import { usePaged } from '@/lib/use-api';
import type { FeedPost } from '@/lib/types';

/** Home: the feed, newest first, loading more as you scroll. */
export default function Feed() {
  const list = usePaged<FeedPost>('/feed', {}, 10);
  return (
    <Column>
      <PagedList
        list={list}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        empty="Nothing in the feed yet."
      />
    </Column>
  );
}

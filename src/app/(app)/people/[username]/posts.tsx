import { useLocalSearchParams } from 'expo-router';

import { Chrome } from '@/components/chrome';
import { FeedPostCard } from '@/components/feed-post-card';
import { PagedList } from '@/components/paged-list';
import { ErrorState, Loading, ScreenTitle } from '@/components/ui';
import { useSession } from '@/lib/session';
import type { FeedPost, Profile } from '@/lib/types';
import { useApi, usePaged } from '@/lib/use-api';

/** One person's feed posts (the website's /{username}/feed). "My feed posts" opens it for you. */
export default function PersonPosts() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useSession();
  const profile = useApi<{ data: Profile }>(`/people/${encodeURIComponent(username)}`);
  const p = profile.data?.data;
  const list = usePaged<FeedPost>(p ? '/feed' : null, { userId: p?.id }, 10);
  const mine = user?.username === username;

  return (
    <Chrome>
      <ScreenTitle title={mine ? 'My feed posts' : p ? `${p.name}'s posts` : 'Posts'} />
      {profile.error ? (
        <ErrorState error={profile.error} onRetry={profile.reload} />
      ) : !p ? (
        <Loading />
      ) : (
        <PagedList
          list={list}
          keyExtractor={(post) => String(post.id)}
          renderItem={({ item }) => <FeedPostCard post={item} onRemoved={(id) => list.setItems((prev) => prev.filter((p) => p.id !== id))} />}
          empty={mine ? "You haven't posted to the feed yet." : 'No posts yet.'}
        />
      )}
    </Chrome>
  );
}

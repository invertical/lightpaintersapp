import { router } from 'expo-router';

import { CategoryList } from '@/components/category-list';
import { Column } from '@/components/chrome';
import type { LinkSection } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Links: the four sections of the directory, and Submit a link. */
export default function Links() {
  const sections = useApi<{ data: LinkSection[] }>('/link-sections');
  return (
    <Column>
      <CategoryList
        title="Links"
        lede="Tutorials, tool makers, resources and stores, picked by the community."
        submitLabel="Submit a link"
        onSubmit={() => router.push('/links/submit')}
        categories={(sections.data?.data ?? []).map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
          count: s.linkCount,
        }))}
        loading={sections.loading}
        error={sections.error}
        onRetry={sections.reload}
        countNoun="links"
        onOpen={(slug) => router.push({ pathname: '/links/[section]', params: { section: slug } })}
      />
    </Column>
  );
}

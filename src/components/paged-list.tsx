import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Empty, ErrorState, Loading } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

type Paged<T> = {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  done: boolean;
  loadMore: () => void;
  refresh: () => void;
};

/**
 * A FlatList over usePaged: pull to refresh, and the next page loads as the end comes
 * into view (continuous scrolling) until there is none left.
 */
export function PagedList<T>({
  list,
  renderItem,
  keyExtractor,
  header,
  empty,
  numColumns,
}: {
  list: Paged<T>;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  header?: ReactElement | null;
  empty: string;
  numColumns?: number;
}) {
  const first = list.items.length === 0;
  return (
    <FlatList
      data={list.items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      key={numColumns ?? 1}
      ListHeaderComponent={header}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Colors.gold} />}
      ListEmptyComponent={
        list.error ? (
          <ErrorState error={list.error} onRetry={list.refresh} />
        ) : list.loading ? (
          <Loading />
        ) : (
          <Empty>{empty}</Empty>
        )
      }
      ListFooterComponent={
        !first && list.loading ? (
          <View style={styles.footer}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : !first && list.error ? (
          <ErrorState error={list.error} onRetry={list.loadMore} />
        ) : null
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  footer: { padding: Spacing.xl },
});

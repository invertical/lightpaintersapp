import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

import { apiFetch, withQuery, type Page, type Query } from '@/lib/api';
import { useSession } from '@/lib/session';

/**
 * GET one resource. Sends the token when signed in (public reads use it to judge adult
 * content and "mine"). `path` null skips the call. State is tagged with the request it
 * answers, so a new path never shows the old one's data and nothing is set until a
 * response arrives.
 */
export function useApi<T>(path: string | null) {
  const { token } = useSession();
  const [state, setState] = useState<{ key: string | null; data: T | null; error: unknown }>({
    key: null,
    data: null,
    error: null,
  });
  const key = path === null ? null : `${token ?? ''} ${path}`;

  const fetchNow = useCallback(async () => {
    if (path === null) return;
    try {
      const data = await apiFetch<T>(path, { token });
      setState({ key, data, error: null });
    } catch (error) {
      setState((s) => ({ key, data: s.key === key ? s.data : null, error }));
    }
  }, [path, token, key]);

  useEffect(() => {
    fetchNow();
  }, [fetchNow]);

  const current = state.key === key;
  const setData = useCallback(
    (next: SetStateAction<T | null>) =>
      setState((s) => ({ ...s, data: typeof next === 'function' ? (next as (prev: T | null) => T | null)(s.data) : next })),
    []
  );

  return {
    data: current ? state.data : null,
    setData,
    error: current ? state.error : null,
    loading: key !== null && !current,
    reload: fetchNow,
  };
}

type PagedState<T> = { key: string | null; items: T[]; page: number; lastPage: number | null; total: number | null; error: unknown };

/**
 * A paginated list that grows as the person scrolls (continuous scrolling): call
 * `loadMore` from FlatList's onEndReached. A change of path or query starts over.
 */
export function usePaged<T>(path: string | null, query: Query = {}, perPage = 20) {
  const { token } = useSession();
  const key = path === null ? null : withQuery(path, { ...query, perPage });
  const [state, setState] = useState<PagedState<T>>({ key: null, items: [], page: 0, lastPage: null, total: null, error: null });
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The list on screen belongs to this key; a stale answer is dropped.
  const live = useRef(key);
  const busy = useRef(false);

  const fetchPage = useCallback(
    async (n: number, replace: boolean) => {
      if (key === null) return;
      busy.current = true;
      try {
        const res = await apiFetch<Page<T>>(withQuery(key, { page: n }), { token });
        if (live.current !== key) return;
        setState((s) => ({
          key,
          items: replace || s.key !== key ? res.data : [...s.items, ...res.data],
          page: res.meta.current_page,
          lastPage: res.meta.last_page,
          total: res.meta.total,
          error: null,
        }));
      } catch (error) {
        if (live.current === key) setState((s) => ({ ...(s.key === key ? s : { items: [], page: 0, lastPage: null, total: null }), key, error }));
      } finally {
        busy.current = false;
        setMore(false);
        setRefreshing(false);
      }
    },
    [key, token]
  );

  useEffect(() => {
    live.current = key;
    fetchPage(1, true);
  }, [key, fetchPage]);

  const current = state.key === key;
  const items = current ? state.items : [];
  const done = current && state.lastPage !== null && state.page >= state.lastPage;

  const loadMore = useCallback(() => {
    if (!current || done || busy.current || state.page === 0) return;
    setMore(true);
    fetchPage(state.page + 1, false);
  }, [current, done, state.page, fetchPage]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, true);
  }, [fetchPage]);

  const setItems = useCallback((next: SetStateAction<T[]>) => {
    setState((s) => ({ ...s, items: typeof next === 'function' ? (next as (prev: T[]) => T[])(s.items) : next }));
  }, []);

  return {
    items,
    setItems,
    total: current ? state.total : null,
    loading: key !== null && (!current || more),
    refreshing,
    error: current ? state.error : null,
    done,
    loadMore,
    refresh,
  };
}

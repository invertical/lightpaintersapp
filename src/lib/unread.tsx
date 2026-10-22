/**
 * The top bar's badge counts, shared by every screen that draws the bar. Each checks one
 * cheap count endpoint when the session starts, when the app comes back to the
 * foreground, and every 30 seconds while it is in front. Screens set it directly from a
 * write's response (mark read, read-all) so the badge moves at once.
 */
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { apiFetch } from '@/lib/api';
import { useSession } from '@/lib/session';

const POLL_MS = 30_000;

export type UnreadValue = {
  /** Null until the first check answers (or while signed out). */
  unread: number | null;
  refresh: () => void;
  setUnread: (n: number) => void;
};

function createUnreadCounter<R>(path: string, pick: (response: R) => number) {
  const Context = createContext<UnreadValue>({ unread: null, refresh: () => {}, setUnread: () => {} });

  function Provider({ children }: { children: ReactNode }) {
    const { token, needsEmail } = useSession();
    // Keyed by token, so a count never outlives its session or shows for the next account.
    const [count, setCount] = useState<{ token: string; n: number } | null>(null);
    const unread = token && count?.token === token ? count.n : null;
    const setUnread = useCallback((n: number) => token && setCount({ token, n }), [token]);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    // An unconfirmed account may call nothing but the email endpoints.
    const active = !!token && !needsEmail;

    const refresh = useCallback(() => {
      if (!active) return;
      apiFetch<R>(path, { token })
        .then((r) => setUnread(pick(r)))
        // A failed check keeps the last number; the next one will try again.
        .catch(() => {});
    }, [active, token, setUnread]);

    useEffect(() => {
      if (!active) return;
      const start = () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(refresh, POLL_MS);
      };
      const stop = () => {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      };
      refresh();
      start();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
          start();
        } else {
          stop();
        }
      });
      return () => {
        stop();
        sub.remove();
      };
    }, [active, refresh]);

    const value = useMemo(() => ({ unread, refresh, setUnread }), [unread, refresh, setUnread]);
    return <Context value={value}>{children}</Context>;
  }

  return { Provider, useUnread: () => use(Context) };
}

const notifications = createUnreadCounter<{ unreadCount: number }>('/me/notifications/unread-count', (r) => r.unreadCount);
const chats = createUnreadCounter<{ unreadThreads: number }>('/me/chats/unread-count', (r) => r.unreadThreads);

export const NotificationsUnreadProvider = notifications.Provider;
export const useNotificationsUnread = notifications.useUnread;
export const ChatsUnreadProvider = chats.Provider;
export const useChatsUnread = chats.useUnread;

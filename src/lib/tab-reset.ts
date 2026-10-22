import { useSyncExternalStore } from 'react';

const resets = new Map<string, number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How many times this tab has been reset; a tab screen keys its content by it. */
export function useTabReset(tab: string) {
  return useSyncExternalStore(subscribe, () => resets.get(tab) ?? 0);
}

/** Start the tab over: its screen remounts, so it refetches and is back at the top. */
export function resetTab(tab: string) {
  resets.set(tab, (resets.get(tab) ?? 0) + 1);
  listeners.forEach((listener) => listener());
}

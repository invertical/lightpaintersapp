import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

import type { ArtistMapProps } from './artist-map';
import type { MapMessage } from './map-html';

/** The web build's ArtistMap: the same map page in an iframe, talking by postMessage. */
export function ArtistMap({ html, onMessage, resetKey }: ArtistMapProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        handler.current(JSON.parse(e.data) as MapMessage);
      } catch {}
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  useEffect(() => {
    const win = frame.current?.contentWindow as (Window & { lpReset?: () => void }) | null | undefined;
    if (resetKey > 0) win?.lpReset?.();
  }, [resetKey]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {createElement('iframe', {
        ref: frame,
        srcDoc: html,
        title: 'Map of artists',
        // Same-origin so Reset can call into it; the page itself is ours.
        sandbox: 'allow-scripts allow-same-origin',
        style: { border: 0, width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
}

import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

import type { MapMessage } from './map-html';

export type ArtistMapProps = {
  html: string;
  onMessage: (message: MapMessage) => void;
  /** Bump to send the map back to the world view. */
  resetKey: number;
};

/** The map page in a WebView (iOS and Android). The web build uses an iframe (artist-map.web.tsx). */
export function ArtistMap({ html, onMessage, resetKey }: ArtistMapProps) {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    if (resetKey > 0) ref.current?.injectJavaScript('window.lpReset && window.lpReset(); true;');
  }, [resetKey]);

  return (
    <WebView
      ref={ref}
      source={{ html, baseUrl: 'https://www.lightpainters.com' }}
      originWhitelist={['*']}
      style={styles.map}
      containerStyle={styles.map}
      onMessage={(e) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data) as MapMessage);
        } catch {}
      }}
      setSupportMultipleWindows={false}
      javaScriptEnabled
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: Colors.background },
});

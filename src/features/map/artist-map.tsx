import { useEffect, useRef, type ComponentType, type Ref } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

import type { MapMessage } from './map-html';

export type ArtistMapProps = {
  html: string;
  onMessage: (message: MapMessage) => void;
  /** Bump to send the map back to the world view. */
  resetKey: number;
};

type WebViewHandle = { injectJavaScript: (script: string) => void };

/**
 * react-native-webview 14 types its default export as the intersection of the iOS,
 * Android and Windows props, which contradict each other, so every prop reads as `never`.
 * These are the props and the ref this map uses; the component is unchanged.
 */
const WebView = RNWebView as unknown as ComponentType<{
  ref?: Ref<WebViewHandle>;
  source: { html: string; baseUrl?: string };
  originWhitelist?: string[];
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  setSupportMultipleWindows?: boolean;
  javaScriptEnabled?: boolean;
}>;

/** The map page in a WebView (iOS and Android). The web build uses an iframe (artist-map.web.tsx). */
export function ArtistMap({ html, onMessage, resetKey }: ArtistMapProps) {
  const ref = useRef<WebViewHandle>(null);

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

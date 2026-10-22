import { router } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { ErrorState, IconButton, Loading, ScreenTitle } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { ArtistMap } from '@/features/map/artist-map';
import { buildMapHtml, type MapArtist, type MapMessage } from '@/features/map/map-html';
import { useApi } from '@/lib/use-api';

type MapData = { data: MapArtist[]; meta: { tileUrl: string; attribution: string; maxZoom: number } };

/**
 * Map search, as on the website (/artists/map): every artist with a picture and a location.
 * Zoomed out, one bubble per country; the USA, Canada and Australia split into states at
 * zoom 3; avatars from zoom 5, each opening a card that links to the profile. Reset goes
 * back to the world.
 */
export default function MapSearch() {
  const map = useApi<MapData>('/people/map');
  const [resetKey, setResetKey] = useState(0);
  const html = useMemo(
    () =>
      map.data
        ? buildMapHtml({ artists: map.data.data, tileUrl: map.data.meta.tileUrl, attribution: map.data.meta.attribution })
        : null,
    [map.data]
  );

  const onMessage = (message: MapMessage) => {
    if (message.type === 'open') router.push({ pathname: '/people/[username]', params: { username: message.username } });
  };

  return (
    <Chrome>
      <ScreenTitle
        title="Map search"
        right={<IconButton icon={RotateCcw} label="Reset the map" onPress={() => setResetKey((k) => k + 1)} />}
      />
      {map.error ? (
        <ErrorState error={map.error} onRetry={map.reload} />
      ) : !html ? (
        <Loading />
      ) : (
        <>
          <View style={styles.bar}>
            <Text style={styles.count}>{`${map.data!.data.length.toLocaleString()} artists on the map`}</Text>
            <Text style={styles.hint}>Tap a bubble to zoom in, an avatar to see who it is.</Text>
          </View>
          <ArtistMap html={html} onMessage={onMessage} resetKey={resetKey} />
        </>
      )}
    </Chrome>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 2 },
  count: { color: Colors.foreground, fontSize: Font.sm, fontWeight: '700' },
  hint: { color: Colors.muted, fontSize: Font.tiny },
});

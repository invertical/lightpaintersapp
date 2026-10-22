import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { Colors, Font, MaxContentWidth, Spacing } from '@/constants/theme';
import { pictureUrl } from '@/lib/format';
import type { Picture } from '@/lib/types';

/** A three-across grid of square pictures; a tap opens the lightbox at that picture. */
export function PictureGrid({ pictures, columns = 3 }: { pictures: Picture[]; columns?: number }) {
  const { width: window } = useWindowDimensions();
  const width = Math.min(window, MaxContentWidth);
  const gap = 2;
  const size = (width - gap * (columns - 1)) / columns;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <View style={[styles.grid, { gap }]}>
        {pictures.map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={p.title ?? 'Open picture'}
            onPress={() => setOpen(i)}>
            <Image
              source={{ uri: pictureUrl(p, size) ?? undefined }}
              style={{ width: size, height: size, backgroundColor: Colors.card }}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        ))}
      </View>
      <Lightbox pictures={pictures} index={open} onIndex={setOpen} />
    </>
  );
}

/** Full-screen pictures, one at a time, with previous and next. */
export function Lightbox({
  pictures,
  index,
  onIndex,
}: {
  pictures: Picture[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  const { width, height } = useWindowDimensions();
  const picture = index === null ? null : pictures[index];
  return (
    <Modal visible={picture !== null} transparent animationType="fade" onRequestClose={() => onIndex(null)}>
      <SafeAreaView style={styles.lightbox}>
        <View style={styles.lightboxHead}>
          <Text style={styles.lightboxCount}>{index !== null ? `${index + 1} / ${pictures.length}` : ''}</Text>
          <IconButton icon={X} label="Close" onPress={() => onIndex(null)} />
        </View>
        {picture ? (
          <Image
            source={{ uri: pictureUrl(picture, width) ?? undefined }}
            style={{ flex: 1, width, maxHeight: height * 0.8 }}
            contentFit="contain"
            accessibilityLabel={picture.title ?? picture.description ?? 'Light painting'}
          />
        ) : null}
        {picture?.title || picture?.description ? (
          <Text style={styles.caption} numberOfLines={3}>
            {[picture.title, picture.description].filter(Boolean).join(' — ')}
          </Text>
        ) : null}
        <View style={styles.lightboxNav}>
          <IconButton
            icon={ChevronLeft}
            label="Previous picture"
            size={30}
            color={index ? Colors.foreground : Colors.border}
            onPress={() => index && onIndex(index - 1)}
          />
          <IconButton
            icon={ChevronRight}
            label="Next picture"
            size={30}
            color={index !== null && index < pictures.length - 1 ? Colors.foreground : Colors.border}
            onPress={() => index !== null && index < pictures.length - 1 && onIndex(index + 1)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  lightboxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md },
  lightboxCount: { color: Colors.muted, fontSize: Font.sm },
  caption: { color: Colors.foreground, fontSize: Font.sm, padding: Spacing.lg, textAlign: 'center' },
  lightboxNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
});

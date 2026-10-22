import {
  AtSign,
  Briefcase,
  Camera,
  Globe,
  Link2,
  MessagesSquare,
  Music2,
  Play,
  ShoppingBag,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { openUrl } from '@/lib/format';
import type { ProfileLink } from '@/lib/types';

/** A link type's icon. Lucide has no brand marks beyond these, so the rest get a stand-in. */
const ICONS: Record<string, LucideIcon> = {
  website: Globe,
  instagram: Camera,
  facebook: MessagesSquare,
  x: AtSign,
  twitter: AtSign,
  tiktok: Music2,
  youtube: Play,
  vimeo: Video,
  flickr: Camera,
  '500px': Camera,
  linkedin: Briefcase,
  store: ShoppingBag,
  shop: ShoppingBag,
};

/** A person's or an org's links, as tappable chips that open in the browser. */
export function LinkChips({ links }: { links: ProfileLink[] }) {
  const usable = links.filter((l) => !!l.url);
  if (usable.length === 0) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Links">
      {usable.map((link, i) => {
        const key = link.type.toLowerCase();
        const Icon = ICONS[key] ?? Link2;
        return (
          <Pressable
            key={`${link.url}-${i}`}
            accessibilityRole="link"
            accessibilityLabel={link.label ?? link.type}
            onPress={() => openUrl(link.url)}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Icon size={15} color={Colors.foreground} />
            <Text style={styles.text}>{link.label || link.type}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardRaised,
  },
  pressed: { opacity: 0.7 },
  text: { color: Colors.foreground, fontSize: Font.tiny, fontWeight: '600' },
});

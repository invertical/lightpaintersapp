import { Check, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, Label } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import type { Tag } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/**
 * Several tags from one vocabulary: the chosen ones as chips, and Edit opens the whole
 * vocabulary to tick. Names, because that is what PATCH /me/profile and POST /feed take.
 */
export function TagPicker({
  type,
  label,
  value,
  onChange,
}: {
  type: string;
  label: string;
  value: string[];
  onChange: (names: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const tags = useApi<{ data: Tag[] }>(open ? `/tags?type=${encodeURIComponent(type)}&sort=name&perPage=100` : null);
  const options = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const all = tags.data?.data ?? [];
    return f ? all.filter((t) => t.name.toLowerCase().includes(f)) : all;
  }, [tags.data, filter]);
  const chosen = new Set(value.map((v) => v.toLowerCase()));

  const toggle = (name: string) =>
    onChange(chosen.has(name.toLowerCase()) ? value.filter((v) => v.toLowerCase() !== name.toLowerCase()) : [...value, name]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Label>{label}</Label>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${label}`} onPress={() => setOpen(true)} hitSlop={8}>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {value.length === 0 ? <Text style={styles.none}>None yet</Text> : value.map((name) => <Chip key={name} label={name} />)}
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={() => setOpen(false)} hitSlop={8}>
              <X size={22} color={Colors.foreground} />
            </Pressable>
          </View>
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter"
            placeholderTextColor={Colors.muted}
            style={styles.filter}
            accessibilityLabel={`Filter ${label}`}
          />
          <FlatList
            data={options}
            keyExtractor={(t) => String(t.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const on = chosen.has(item.name.toLowerCase());
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(item.name)}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <Text style={[styles.optionText, on && styles.on]}>{item.name}</Text>
                  {on ? <Check size={18} color={Colors.gold} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  edit: { color: Colors.gold, fontWeight: '700', fontSize: Font.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  none: { color: Colors.muted, fontSize: Font.sm },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: { maxHeight: '80%', backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  sheetTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  filter: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    minHeight: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardRaised,
    paddingHorizontal: Spacing.md,
    color: Colors.foreground,
  },
  option: { minHeight: 48, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { backgroundColor: Colors.cardRaised },
  optionText: { color: Colors.foreground, fontSize: Font.base },
  on: { color: Colors.gold, fontWeight: '700' },
});

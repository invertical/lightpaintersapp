import { Check, ChevronDown, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, Radius, Spacing } from '@/constants/theme';

export type Option<V extends string | number> = { value: V; label: string };

/**
 * A dropdown: a field that opens a sheet of options, with a filter box when the list is
 * long. The same on iOS, Android and web (the website's checkbox groups become one pick).
 */
export function Select<V extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
}: {
  label: string;
  value: V | null;
  options: Option<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const current = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? options.filter((o) => o.label.toLowerCase().includes(f)) : options;
  }, [filter, options]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={styles.field}>
        <Text style={[styles.value, !current && styles.placeholder]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={Colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {label}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={8}>
              <X size={22} color={Colors.foreground} />
            </Pressable>
          </View>
          {options.length > 12 ? (
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Filter"
              placeholderTextColor={Colors.muted}
              style={styles.filter}
              autoCorrect={false}
              accessibilityLabel={`Filter ${label}`}
            />
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                  setFilter('');
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                <Text style={[styles.optionText, item.value === value && styles.optionSelected]}>{item.label}</Text>
                {item.value === value ? <Check size={18} color={Colors.gold} /> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: Colors.muted, fontSize: Font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  field: {
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  value: { flex: 1, color: Colors.foreground, fontSize: Font.base },
  placeholder: { color: Colors.muted },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    maxHeight: '75%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.sm,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  sheetTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  filter: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    minHeight: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardRaised,
    paddingHorizontal: Spacing.md,
    color: Colors.foreground,
    fontSize: Font.base,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionPressed: { backgroundColor: Colors.cardRaised },
  optionText: { color: Colors.foreground, fontSize: Font.base },
  optionSelected: { color: Colors.gold, fontWeight: '700' },
});

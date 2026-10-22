import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Label } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

export type DateFieldProps = {
  label: string;
  mode: 'date' | 'time';
  /** "YYYY-MM-DD" for a date, "HH:MM" (24-hour) for a time; "" when not set. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toValue = (d: Date, mode: 'date' | 'time') =>
  mode === 'date' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function toDate(value: string, mode: 'date' | 'time') {
  const d = new Date();
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    d.setFullYear(y, m - 1, day);
  } else if (mode === 'time' && /^\d{2}:\d{2}$/.test(value)) {
    const [h, min] = value.split(':').map(Number);
    d.setHours(h, min, 0, 0);
  } else if (mode === 'time') {
    d.setHours(19, 0, 0, 0);
  }
  return d;
}

/** How the chosen value reads on the field, in the phone's own format. */
function display(value: string, mode: 'date' | 'time') {
  if (!value) return mode === 'date' ? 'Choose a date' : 'Choose a time';
  const d = toDate(value, mode);
  return mode === 'date'
    ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * A date or a time, picked with the platform's own picker
 * (@react-native-community/datetimepicker, in Expo Go): Android's dialog, iOS's wheel in a
 * sheet. The web build has its own (date-field.web.tsx).
 */
export function DateField({ label, mode, value, onChange, error }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(value, mode));
  const Icon = mode === 'date' ? CalendarDays : Clock;

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value, mode),
        mode,
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toValue(date, mode));
        },
      });
      return;
    }
    setDraft(toDate(value, mode));
    setOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <Label>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display(value, mode)}`}
        onPress={press}
        style={[styles.field, !!error && styles.invalid]}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {display(value, mode)}
        </Text>
        <Icon size={18} color={Colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            themeVariant="dark"
            accentColor={Colors.gold}
            onChange={(_, date) => date && setDraft(date)}
          />
          <View style={styles.actions}>
            {value ? (
              <Button
                label="Clear"
                variant="secondary"
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
                style={styles.action}
              />
            ) : null}
            <Button
              label="Done"
              onPress={() => {
                onChange(toValue(draft, mode));
                setOpen(false);
              }}
              style={styles.action}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
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
  invalid: { borderColor: Colors.danger },
  value: { flex: 1, color: Colors.foreground, fontSize: Font.base },
  placeholder: { color: Colors.muted },
  error: { color: Colors.danger, fontSize: Font.tiny },
});

const styles = StyleSheet.create({
  ...fieldStyles,
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.md },
  action: { flex: 1 },
});

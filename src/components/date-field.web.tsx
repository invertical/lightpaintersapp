import { createElement } from 'react';
import { Text, View } from 'react-native';

import { Label } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

import type { DateFieldProps } from './date-field';

/**
 * The web build's DateField: the browser's own date and time inputs, which give a
 * calendar and a time picker everywhere. Same values as the phone's ("YYYY-MM-DD", "HH:MM").
 */
export function DateField({ label, mode, value, onChange, error }: DateFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      {createElement('input', {
        type: mode,
        value,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        style: {
          minHeight: 46,
          boxSizing: 'border-box',
          borderRadius: Radius.md,
          border: `1px solid ${error ? Colors.danger : Colors.border}`,
          backgroundColor: Colors.card,
          color: Colors.foreground,
          colorScheme: 'dark',
          padding: `0 ${Spacing.md}px`,
          fontSize: Font.base,
          fontFamily: 'inherit',
        },
      })}
      {error ? <Text style={{ color: Colors.danger, fontSize: Font.tiny }}>{error}</Text> : null}
    </View>
  );
}

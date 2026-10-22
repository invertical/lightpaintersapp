import { useCallback, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';

/**
 * The width a full-bleed picture really has: measured from its container, so a scrollbar
 * (web) or an inset never makes it overflow. Until the first layout, the window's width
 * (capped like the content column) stands in.
 */
export function useMeasuredWidth() {
  const { width: window } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => setMeasured(Math.floor(e.nativeEvent.layout.width)), []);
  return { width: measured ?? Math.min(window, MaxContentWidth), onLayout };
}

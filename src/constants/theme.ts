/**
 * The website's dark theme (resources/css/brand.css in the Laravel repo): gold #CC9F6C on
 * navy #14162C. The app is dark-only, like the website's default.
 */
export const Colors = {
  background: '#14162C',
  card: '#1C1F3B',
  cardRaised: '#23264A',
  border: '#2E3260',
  foreground: '#E8E6F0',
  muted: '#A9ABC4',
  gold: '#CC9F6C',
  onGold: '#14162C',
  danger: '#F2777A',
  success: '#6FCF97',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const Font = {
  tiny: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const MaxContentWidth = 720;

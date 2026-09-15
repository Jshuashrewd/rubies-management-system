/**
 * Design tokens derived from the Stitch "Rubies Code School System" (DESIGN.md).
 * Uses the documented role values from the prose (which the screens follow),
 * not the raw frontmatter token block.
 *
 * Colours are hex strings usable directly in React Native and on web.
 * Spacing / radius are unitless pixel numbers (RN-friendly; treat as px on web).
 */

export const colors = {
  // Structure — deep purple masses anchor nav, headers, structural panels.
  primary: '#2B1450',
  primaryHover: '#3C1D6E',
  primaryContainer: '#120031',
  // Spotlight CTA — the single most important action per screen ONLY.
  accent: '#FF7A29',
  accentHover: '#E86517',
  // Text
  textPrimary: '#1A102E',
  textSecondary: '#5C5470',
  // Borders / dividers
  border: '#E2DFEA',
  borderStrong: '#D5D0E3',
  // Surfaces
  canvas: '#FFFFFF',
  canvasTint: '#F7F5FA',
  white: '#FFFFFF',
  // Semantic suite
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const roleBadge = {
  student: { bg: '#F0ECF8', text: '#2B1450' },
  trainer: { bg: '#ECFDF5', text: '#047857' },
  admin: { bg: '#1A102E', text: '#FFFFFF' },
} as const;

/** 8-point-ish spacing scale from DESIGN.md. */
export const spacing = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/** Disciplined, compact rounding ("soft architectural geometry"). */
export const radius = {
  sm: 2,
  base: 4, // badges, chips
  md: 6, // inputs, buttons, dropdowns
  lg: 8, // cards, containers, modals
  xl: 12,
  full: 9999,
} as const;

export const fontFamily = {
  display: 'Space Grotesk', // titles, headlines
  body: 'Inter', // body, labels, metrics
  mono: 'JetBrains Mono', // ids, credentials, code
} as const;

export const fontSize = {
  displayLg: 48,
  displayLgMobile: 34,
  headlineLg: 32,
  headlineLgMobile: 26,
  headlineMd: 24,
  headlineSm: 20,
  titleLg: 18,
  titleMd: 16,
  bodyLg: 16,
  bodyMd: 14,
  bodySm: 12,
  labelLg: 14,
  labelMd: 12,
  labelSm: 11,
} as const;

export const fontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

export const tokens = {
  colors,
  roleBadge,
  spacing,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
} as const;

export type Tokens = typeof tokens;

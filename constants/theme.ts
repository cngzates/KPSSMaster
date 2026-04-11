// KPSS Master - Design Tokens (High Contrast Dark Theme)
export const Colors = {
  // Backgrounds
  bg: '#0D0F1C',
  bgSurface: '#161929',
  bgCard: '#1C2038',
  bgCardAlt: '#232845',
  bgInput: '#1A1E35',

  // Brand
  primary: '#6B8FFF',
  primaryLight: '#99B3FF',
  primaryDark: '#3A58DC',
  accent: '#F72585',
  gold: '#FFD60A',
  goldLight: '#FFE66D',

  // Semantic
  success: '#06D6A0',
  successBg: '#06D6A018',
  error: '#FF4D6D',
  errorBg: '#FF4D6D18',
  warning: '#FFAB40',
  warningBg: '#FFAB4018',
  info: '#4CC9F0',

  // Text — maksimum kontrast
  textPrimary: '#FFFFFF',
  textSecondary: '#C8CCEE',
  textMuted: '#7880A8',
  textInverse: '#0D0F1C',

  // Borders — belirgin ama soft
  border: '#2E3358',
  borderLight: '#3D4470',

  // Tab bar — beyaz ikonlar
  tabBg: '#0F1225',
  tabBorder: '#1E2245',
  tabActive: '#6B8FFF',
  tabInactive: '#FFFFFF',   // Tam beyaz → navigasyon her zaman okunabilir
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  hero: 28,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

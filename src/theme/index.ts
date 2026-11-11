import { Dimensions, Platform, PixelRatio } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Proportional scaling based on standard iPhone 11/13 width (375)
const scale = SCREEN_WIDTH / 375;

export function normalize(size: number) {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
}

export { wp, hp };

// Sadapay-inspired theme
export const Colors = {
  // Primary colors (Sadapay uses distinctive purple/blue tones)
  primary: '#6C5CE7',
  primaryDark: '#5649C0',
  primaryLight: '#A29BFE',

  // Secondary / Accent
  accent: '#00D4AA', // Green for positive actions
  accentDark: '#00B894',

  danger: '#FF6B6B',
  warning: '#FDCB6E',

  // Background colors
  background: '#0D0D0D', // Dark background like Sadapay
  backgroundSecondary: '#1A1A1A',
  backgroundCard: '#252525',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B2B2B2',
  textMuted: '#6E6E6E',

  // Border
  border: '#333333',
  borderLight: '#444444',

  // Status colors
  success: '#00D4AA',
  error: '#FF6B6B',
  info: '#74B9FF',

  // Gradient colors
  gradientStart: '#6C5CE7',
  gradientEnd: '#A29BFE',

  // Gold specific
  gold: '#FFD700',
  goldDark: '#FFA500',
};

// Responsive spacing based on a standard 375pt width
export const Spacing = {
  xs: wp(1.1),   // ~4px
  sm: wp(2.1),   // ~8px
  md: wp(4.3),   // ~16px
  lg: wp(6.4),   // ~24px
  xl: wp(8.5),   // ~32px
  xxl: wp(12.8), // ~48px
};

export const Typography = {
  // Font sizes scaled to screen width using normalize
  fontSize: {
    xs: normalize(12),
    sm: normalize(14),
    md: normalize(16),
    lg: normalize(20),
    xl: normalize(24),
    xxl: normalize(32),
    xxxl: normalize(48),
  },

  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const BorderRadius = {
  sm: wp(2.1),   // ~8px
  md: wp(3.2),   // ~12px
  lg: wp(4.3),   // ~16px
  xl: wp(6.4),   // ~24px
  round: 999,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

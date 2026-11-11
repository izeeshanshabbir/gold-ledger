import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'gradient' | 'outlined';
  onPress?: () => void;
  padding?: keyof typeof Spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'lg',
}) => {
  const cardStyle = [
    styles.card,
    { padding: Spacing[padding] },
    variant === 'outlined' && styles.outlined,
    variant === 'gradient' && styles.gradient,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  gradient: {
    backgroundColor: Colors.primary,
  },
});

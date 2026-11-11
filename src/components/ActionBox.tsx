import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';

interface ActionBoxProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  color?: string;
}

export const ActionBox: React.FC<ActionBoxProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  color = Colors.primary,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  return (
    <TouchableOpacity
      style={[styles.container, isCompact && styles.containerCompact]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconContainer,
          isCompact && styles.iconContainerCompact,
          { backgroundColor: color + '20' },
        ]}
      >
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[styles.title, isCompact && styles.titleCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {title}
        </Text>
        <Text
          style={[styles.subtitle, isCompact && styles.subtitleCompact]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    flex: 1,
    minWidth: 0,
    height: hp(16),
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(1.6),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerCompact: {
    height: hp(15.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.35),
  },
  iconContainer: {
    width: wp(11),
    height: wp(11),
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerCompact: {
    width: wp(10),
    height: wp(10),
  },
  textContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    width: '100%',
  },
  title: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: hp(0.5),
  },
  titleCompact: {
    fontSize: Typography.fontSize.sm,
    marginBottom: hp(0.35),
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: hp(1.8),
  },
  subtitleCompact: {
    fontSize: normalize(11),
    lineHeight: hp(1.65),
  },
});

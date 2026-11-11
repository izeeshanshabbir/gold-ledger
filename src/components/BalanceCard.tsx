import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, BorderRadius, Typography, wp, hp } from '../theme';

interface BalanceCardProps {
  tokenBalance: number;
  cashBalance: number;
  currentPrice: number;
  dayStartPrice: number;
  showTokens?: boolean;
  onToggle?: () => void;
  dayChange: {
    percentage: number;
    isPositive: boolean;
  };
  lastPriceChange: {
    value: number;
    percentage: number;
    isPositive: boolean;
  };
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  tokenBalance,
  cashBalance,
  currentPrice,
  dayStartPrice,
  showTokens = true,
  onToggle,
  dayChange,
  lastPriceChange,
}) => {
  const displayValue = showTokens ? tokenBalance : cashBalance;
  const displayLabel = showTokens ? 'Gold Tokens' : 'Cash Balance';
  const tokenValue = tokenBalance * currentPrice;
  const formattedDisplayValue = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dayChangeTextStyle = dayChange.isPositive
    ? styles.priceChangePositive
    : styles.priceChangeNegative;
  const lastPriceChangeTextStyle = lastPriceChange.isPositive
    ? styles.priceChangePositive
    : styles.priceChangeNegative;
  const dayChangeSign = dayChange.isPositive ? '+' : '-';
  const lastPriceChangeSign = lastPriceChange.isPositive ? '+' : '-';
  const modeText = showTokens ? 'View Cash' : 'View Gold';

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.glowOrbPrimary} />
      <View style={styles.glowOrbSecondary} />

      <View style={styles.topSection}>
        <View style={styles.titleWrap}>
          <Text style={styles.label}>{displayLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleText}>{modeText}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.midSection}>
        <Text style={styles.balance} numberOfLines={1}>
          {formattedDisplayValue}
        </Text>
        <Text style={styles.balanceUnit}>
          {showTokens ? 'Grams of Digital Gold' : 'USD Available'}
        </Text>
      </View>

      <View style={styles.marketPanel}>
        <View style={styles.priceRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.infoLabel}>Day start price</Text>
            <Text style={styles.priceValue}>${dayStartPrice.toFixed(2)}/g</Text>
          </View>
          <View style={styles.priceBlockRight}>
            <Text style={styles.infoLabel}>Position value</Text>
            <Text style={styles.priceValue}>${tokenValue.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.movementRow}>
          <View style={styles.movementPill}>
            <Text style={styles.infoLabel}>Today</Text>
            <Text style={[styles.priceChangeText, dayChangeTextStyle]}>
              {dayChangeSign}
              {Math.abs(dayChange.percentage).toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.movementPill, styles.movementPillRight]}>
            <Text style={styles.infoLabel}>Last move</Text>
            <Text style={[styles.priceChangeText, lastPriceChangeTextStyle]}>
              {lastPriceChangeSign}
              {Math.abs(lastPriceChange.percentage).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    minHeight: hp(13.8),
    marginTop: hp(1.4),
    overflow: 'hidden',
    position: 'relative',
  },
  glowOrbPrimary: {
    position: 'absolute',
    top: -hp(2.5),
    right: -wp(8),
    width: wp(36),
    height: wp(36),
    borderRadius: wp(18),
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glowOrbSecondary: {
    position: 'absolute',
    bottom: -hp(4),
    left: -wp(10),
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
    backgroundColor: 'rgba(18, 12, 40, 0.18)',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(5.2),
  },
  titleWrap: {
    flex: 1,
    paddingRight: wp(3.2),
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.fontSize.lg,
    color: 'rgba(255,255,255,0.94)',
    fontWeight: Typography.fontWeight.semibold,
  },
  toggleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.65),
    borderRadius: BorderRadius.round,
    minWidth: wp(23),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toggleText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
  },
  midSection: {
    marginBottom: hp(1.3),
    alignItems: 'center',
  },
  balance: {
    width: '100%',
    fontSize: Typography.fontSize.xxl,
    lineHeight: wp(14.6),
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -1,
  },
  balanceUnit: {
    marginTop: hp(0.45),
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  marketPanel: {
    marginHorizontal: wp(5.2),
    marginBottom: hp(1.5),
    paddingHorizontal: wp(5.2),
    paddingVertical: hp(1.4),
    backgroundColor: 'rgba(24, 18, 46, 0.20)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: hp(1.1),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  priceBlock: {
    flex: 1,
    paddingRight: wp(3),
  },
  priceBlockRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: wp(3),
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2.4),
    paddingTop: hp(1.1),
  },
  movementPill: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
  },
  movementPillRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: hp(0.5),
  },
  priceValue: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontWeight: '800',
  },
  priceChangeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  priceChangePositive: {
    color: Colors.text,
  },
  priceChangeNegative: {
    color: 'rgba(255,255,255,0.92)',
  },
});

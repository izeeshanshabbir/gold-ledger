import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { ActionBox } from '../components/ActionBox';
import { BalanceCard } from '../components/BalanceCard';
import { BuyIcon, SellIcon, TransferIcon } from '../components/Icons';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { AppDispatch } from '../store/store';
import {
  fetchDayChangeBasePrice,
  fetchWalletData,
  listenToWalletUpdates,
  selectDayChange,
  selectLastPriceChange,
  selectPortfolioValue,
  selectProfitLoss,
  startHybridPriceSystem,
  stopHybridPriceSystem,
  stopWalletUpdates,
} from '../store/slices/walletSlice';
import { Colors, BorderRadius, Typography, normalize } from '../theme';
import { RootState } from '../types';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    cashBalance,
    tokenBalance,
    currentGoldPrice,
    dayChangeBasePrice,
  } = useSelector(
    (state: RootState) => state.wallet,
  );

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Trader';
  const profileInitial = displayName[0]?.toUpperCase() || 'U';

  const [showTokens, setShowTokens] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const portfolioValue = useSelector(selectPortfolioValue);
  const profitLoss = useSelector(selectProfitLoss);
  const dayChange = useSelector(selectDayChange);
  const lastPriceChange = useSelector(selectLastPriceChange);

  const tokenValue = tokenBalance * currentGoldPrice;
  const cashPercentage = portfolioValue > 0 ? (cashBalance / portfolioValue) * 100 : 0;
  const tokenPercentage = portfolioValue > 0 ? (tokenValue / portfolioValue) * 100 : 0;
  const dayChangeValue = dayChange.value;
  const dayChangeSign = dayChange.isPositive ? '+' : '-';
  const lastPriceChangeSign = lastPriceChange.isPositive ? '+' : '-';
  const dayStartPrice = dayChangeBasePrice ?? currentGoldPrice;

  useEffect(() => {
    let isMounted = true;

    const setupDashboard = async () => {
      if (!user?.uid || !isMounted) return;

      try {
        await dispatch(fetchWalletData(user.uid)).unwrap();
        await dispatch(
          startHybridPriceSystem({
            localUpdateSeconds: 10,
            syncSeconds: 60,
          }),
        ).unwrap();
        dispatch(listenToWalletUpdates(user.uid));
        await dispatch(fetchDayChangeBasePrice()).unwrap();
      } catch (error) {
        console.error('[Dashboard] Setup error:', error);
        Alert.alert('Setup Error', 'Could not load dashboard data');
      }
    };

    setupDashboard();

    return () => {
      if (isMounted) {
        dispatch(stopHybridPriceSystem());
        dispatch(stopWalletUpdates());
        isMounted = false;
      }
    };
  }, [dispatch, user?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {displayName}
            </Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>Simulated market</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.profileInitial}>
              {profileInitial}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerBannerText}>
            Practice simulation. Balances are virtual — no real gold or currency
            is bought, sold or transferred.
          </Text>
        </View>

        <BalanceCard
          tokenBalance={tokenBalance}
          cashBalance={cashBalance}
          currentPrice={currentGoldPrice}
          dayStartPrice={dayStartPrice}
          showTokens={showTokens}
          dayChange={dayChange}
          lastPriceChange={lastPriceChange}
          onToggle={() => setShowTokens(!showTokens)}
        />

        <View style={styles.marketStrip}>
          <View style={styles.marketStripItem}>
            <Text style={styles.marketStripLabel}>Spot price</Text>
            <Text style={styles.marketStripValue}>
              ${currentGoldPrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.marketStripItem}>
            <Text style={styles.marketStripLabel}>Today's move</Text>
            <Text
              style={[
                styles.marketStripValue,
                {
                  color: dayChange.isPositive ? Colors.success : Colors.danger,
                },
              ]}
            >
              {dayChangeSign}
              ${Math.abs(dayChangeValue).toFixed(2)}
            </Text>
          </View>
          <View style={styles.marketStripItem}>
            <Text style={styles.marketStripLabel}>Last move</Text>
            <Text
              style={[
                styles.marketStripValue,
                {
                  color: lastPriceChange.isPositive
                    ? Colors.success
                    : Colors.danger,
                },
              ]}
            >
              {lastPriceChangeSign}
              ${Math.abs(lastPriceChange.value).toFixed(2)}
            </Text>
          </View>
          <View style={styles.marketStripItem}>
            <Text style={styles.marketStripLabel}>Gold held</Text>
            <Text style={styles.marketStripValue}>
              {tokenBalance.toFixed(2)}g
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionCaption}>
            Trade or move your position in seconds
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <ActionBox
            title="Buy"
            subtitle="Get tokens"
            icon={<BuyIcon size={wp(5)} color={Colors.success} />}
            onPress={() => navigation.navigate('Buy')}
            color={Colors.success}
          />
          <ActionBox
            title="Sell"
            subtitle="Convert to cash"
            icon={<SellIcon size={wp(5)} color={Colors.danger} />}
            onPress={() => navigation.navigate('Sell')}
            color={Colors.danger}
          />
          <ActionBox
            title="Transfer"
            subtitle="Send tokens"
            icon={<TransferIcon size={wp(5)} color={Colors.primary} />}
            onPress={() => navigation.navigate('Transfer')}
            color={Colors.primary}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Portfolio Snapshot</Text>
          <Text style={styles.sectionCaption}>
            Your performance and allocation at a glance
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardWide]}>
            <View style={styles.summaryHeaderRow}>
              <Text style={styles.summaryLabel}>Portfolio Value</Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: profitLoss.isPositive
                      ? Colors.success + '18'
                      : Colors.danger + '18',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: profitLoss.isPositive ? Colors.success : Colors.danger,
                    },
                  ]}
                >
                  {profitLoss.isPositive ? '+' : ''}
                  {profitLoss.percentage.toFixed(2)}%
                </Text>
              </View>
            </View>
            <Text style={styles.heroValue}>${portfolioValue.toFixed(2)}</Text>
            <Text style={styles.summarySupportText}>
              {profitLoss.isPositive ? 'Up' : 'Down'} $
              {Math.abs(profitLoss.value).toFixed(2)} from your tracked baseline
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cash Reserve</Text>
            <Text style={styles.metricValue}>${cashBalance.toFixed(2)}</Text>
            <Text style={styles.summaryMeta}>
              {cashPercentage.toFixed(1)}% of portfolio
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gold Exposure</Text>
            <Text style={styles.metricValue}>${tokenValue.toFixed(2)}</Text>
            <Text style={styles.summaryMeta}>
              {tokenPercentage.toFixed(1)}% of portfolio
            </Text>
          </View>
        </View>

        <View style={styles.allocationCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.sectionTitleCompact}>Asset Allocation</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: dayChange.isPositive
                    ? Colors.success + '16'
                    : Colors.danger + '16',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: dayChange.isPositive ? Colors.success : Colors.danger,
                  },
                ]}
              >
                {dayChange.isPositive ? '+' : ''}
                {dayChange.percentage.toFixed(2)}% today
              </Text>
            </View>
          </View>

          <View style={styles.allocationBar}>
            <View
              style={[
                styles.allocationBarCash,
                { width: `${cashPercentage.toFixed(1)}%` },
              ]}
            />
            <View
              style={[
                styles.allocationBarGold,
                { width: `${tokenPercentage.toFixed(1)}%` },
              ]}
            />
          </View>

          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownItem}>
              <View
                style={[styles.breakdownDot, { backgroundColor: Colors.success }]}
              />
              <Text style={styles.breakdownLabel}>Cash</Text>
              <Text style={styles.breakdownValue}>${cashBalance.toFixed(2)}</Text>
              <Text style={styles.breakdownPercentage}>
                {cashPercentage.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View
                style={[
                  styles.breakdownDot,
                  { backgroundColor: Colors.primaryLight },
                ]}
              />
              <Text style={styles.breakdownLabel}>Gold Tokens</Text>
              <Text style={styles.breakdownValue}>{tokenBalance.toFixed(2)}g</Text>
              <Text style={styles.breakdownPercentage}>
                {tokenPercentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.sectionTitleCompact}>Market Insight</Text>
          <Text style={styles.insightTitle}>
            {dayChange.isPositive ? 'Momentum is on your side' : 'Price is pulling back'}
          </Text>
          <Text style={styles.insightText}>
            Gold is trading at ${currentGoldPrice.toFixed(2)}/g and your token
            position is worth ${tokenValue.toFixed(2)} right now. The latest
            tick moved {lastPriceChangeSign}$
            {Math.abs(lastPriceChange.value).toFixed(2)} (
            {lastPriceChangeSign}
            {Math.abs(lastPriceChange.percentage).toFixed(2)}%). Use buy when
            you want more exposure, or sell to move back into cash.
          </Text>
        </View>
      </ScrollView>

      <ProfileDrawer
        isVisible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: wp(5.3),
    paddingBottom: hp(13.2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: hp(1.3),
    marginBottom: hp(1.3),
  },
  disclaimerBanner: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.1),
    marginBottom: hp(1.5),
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.warning + '14',
    borderWidth: 1,
    borderColor: Colors.warning + '2E',
  },
  disclaimerBannerText: {
    fontSize: Typography.fontSize.xs,
    lineHeight: normalize(16),
    color: Colors.warning,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  userName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1.6),
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.round,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.65),
  },
  liveDot: {
    width: wp(2.1),
    height: wp(2.1),
    borderRadius: wp(1),
    backgroundColor: Colors.accent,
    marginRight: wp(2.1),
  },
  livePillText: {
    color: Colors.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  profileButton: {
    width: wp(12.8),
    height: wp(12.8),
    borderRadius: wp(6.4),
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileInitial: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  marketStrip: {
    marginTop: hp(1.6),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: wp(2.6),
    marginBottom: hp(2.6),
  },
  marketStripItem: {
    width: '48%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: wp(3.7),
    paddingVertical: hp(1.35),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marketStripLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: hp(0.5),
  },
  marketStripValue: {
    color: Colors.text,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionHeader: {
    marginBottom: hp(1.3),
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionTitleCompact: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionCaption: {
    marginTop: hp(0.5),
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: wp(2.6),
    marginBottom: hp(2.6),
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  summaryCard: {
    width: '48.2%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: wp(3.7),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: hp(1.5),
  },
  summaryCardWide: {
    width: '100%',
    paddingBottom: hp(2.4),
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  heroValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    marginTop: hp(1),
    color: Colors.text,
  },
  metricValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    marginTop: hp(1),
    color: Colors.text,
  },
  summarySupportText: {
    marginTop: hp(0.8),
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: normalize(20),
  },
  summaryMeta: {
    marginTop: hp(0.8),
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: wp(2.6),
    paddingVertical: hp(0.5),
    borderRadius: BorderRadius.round,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '800',
  },
  allocationCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: hp(2),
  },
  allocationBar: {
    flexDirection: 'row',
    width: '100%',
    height: hp(1.1),
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    marginTop: hp(1.6),
    marginBottom: hp(1.6),
  },
  allocationBarCash: {
    backgroundColor: Colors.success,
  },
  allocationBarGold: {
    backgroundColor: Colors.primaryLight,
  },
  breakdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2.6),
  },
  breakdownItem: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(2.6),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  breakdownDot: {
    width: wp(2.6),
    height: wp(2.6),
    borderRadius: wp(1.3),
    marginBottom: hp(0.8),
  },
  breakdownLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  breakdownValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: hp(0.4),
  },
  breakdownPercentage: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  insightCard: {
    borderRadius: BorderRadius.xl,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  insightTitle: {
    marginTop: hp(0.8),
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  insightText: {
    marginTop: hp(1),
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: normalize(20),
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { MarketLineChart } from '../components/MarketLineChart';
import {
  fetchPriceHistory,
  selectPortfolioValue,
  selectProfitLoss,
} from '../store/slices/walletSlice';
import { AppDispatch } from '../store/store';
import { RootState } from '../types';
import { BorderRadius, Colors, Typography, hp, normalize, wp } from '../theme';

type PricePoint = {
  price: number;
  timestamp: number;
};

const HISTORY_LIMIT = 72;
const PORTFOLIO_CHANGE_EPSILON = 0.005;

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatAxisCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}m`;
  }

  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }

  return `$${value.toFixed(0)}`;
};

const formatTimeLabel = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTimelineLabel = (timestamp: number, spanMs: number) => {
  if (spanMs > 24 * 60 * 60 * 1000) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return formatTimeLabel(timestamp);
};

const getPortfolioChangeMeta = (change: number) => {
  if (Math.abs(change) < PORTFOLIO_CHANGE_EPSILON) {
    return {
      color: Colors.textSecondary,
      isPositive: false,
      prefix: '',
      status: 'flat' as const,
    };
  }

  return {
    color: change > 0 ? Colors.success : Colors.danger,
    isPositive: change > 0,
    prefix: change > 0 ? '+' : '-',
    status: change > 0 ? 'up' as const : 'down' as const,
  };
};

const buildFallbackHistory = (currentGoldPrice: number): PricePoint[] => {
  const now = Date.now();
  const safePrice = Number.isFinite(currentGoldPrice) ? currentGoldPrice : 65.5;

  return Array.from({ length: 24 }, (_, index) => {
    const distanceFromLatest = 23 - index;
    const momentum = Math.sin(index * 0.5) * 0.36;
    const pulse = Math.cos(index * 0.24) * 0.14;
    const drift = (index - 23) * 0.03;

    return {
      price: Math.max(1, safePrice + momentum + pulse + drift),
      timestamp: now - distanceFromLatest * 30 * 60 * 1000,
    };
  });
};

const normalizeHistory = (
  history: PricePoint[],
  currentGoldPrice: number,
): PricePoint[] => {
  const validHistory = history
    .filter(
      point =>
        Number.isFinite(point.price) &&
        Number.isFinite(point.timestamp) &&
        point.price > 0,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (validHistory.length === 0) {
    return buildFallbackHistory(currentGoldPrice);
  }

  const latestPoint = validHistory[validHistory.length - 1];

  if (
    Number.isFinite(currentGoldPrice) &&
    currentGoldPrice > 0 &&
    Math.abs(latestPoint.price - currentGoldPrice) > 0.005
  ) {
    return [...validHistory, { price: currentGoldPrice, timestamp: Date.now() }];
  }

  return validHistory;
};

export const PortfolioChartScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    cashBalance,
    tokenBalance,
    currentGoldPrice,
    priceHistory,
    isPriceLoading,
    error,
  } = useSelector((state: RootState) => state.wallet);
  const portfolioValue = useSelector(selectPortfolioValue);
  const profitLoss = useSelector(selectProfitLoss);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    await dispatch(fetchPriceHistory(HISTORY_LIMIT));
  }, [dispatch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadHistory();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadHistory]);

  const pricePoints = useMemo(
    () => normalizeHistory(priceHistory, currentGoldPrice),
    [currentGoldPrice, priceHistory],
  );

  const portfolioPoints = useMemo(
    () =>
      pricePoints.map(point => ({
        value: cashBalance + tokenBalance * point.price,
        timestamp: point.timestamp,
      })),
    [cashBalance, pricePoints, tokenBalance],
  );

  const chartStats = useMemo(() => {
    const first = portfolioPoints[0]?.value ?? portfolioValue;
    const latest =
      portfolioPoints[portfolioPoints.length - 1]?.value ?? portfolioValue;
    const values = portfolioPoints.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const change = latest - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    const changeMeta = getPortfolioChangeMeta(change);
    const goldValue = tokenBalance * currentGoldPrice;
    const goldShare = latest > 0 ? (goldValue / latest) * 100 : 0;
    const cashShare = latest > 0 ? (cashBalance / latest) * 100 : 0;

    return {
      latest,
      min,
      max,
      change,
      changePercent,
      changeColor: changeMeta.color,
      changePrefix: changeMeta.prefix,
      changeStatus: changeMeta.status,
      isPositive: changeMeta.isPositive,
      goldValue,
      goldShare,
      cashShare,
    };
  }, [cashBalance, currentGoldPrice, portfolioPoints, portfolioValue, tokenBalance]);

  const trackedProfitLossMeta = getPortfolioChangeMeta(profitLoss.value);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={Colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Portfolio</Text>
          <Text style={styles.title}>Portfolio Price Change</Text>
          <Text style={styles.subtitle}>
            Cash plus gold token value plotted against the live market timeline.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.cardLabel}>Portfolio value</Text>
              <Text style={styles.heroValue}>
                {formatCurrency(chartStats.latest)}
              </Text>
            </View>
            <View
              style={[
                styles.changePill,
                { backgroundColor: chartStats.changeColor + '18' },
              ]}
            >
              <Text
                style={[
                  styles.changePillText,
                  { color: chartStats.changeColor },
                ]}
              >
                {chartStats.changePrefix}
                {Math.abs(chartStats.changePercent).toFixed(2)}%
              </Text>
            </View>
          </View>

          <View style={styles.allocationRow}>
            <View style={styles.allocationItem}>
              <Text style={styles.allocationLabel}>Cash</Text>
              <Text style={styles.allocationValue}>
                {chartStats.cashShare.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.allocationDivider} />
            <View style={styles.allocationItem}>
              <Text style={styles.allocationLabel}>Gold</Text>
              <Text style={styles.allocationValue}>
                {chartStats.goldShare.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.allocationDivider} />
            <View style={styles.allocationItem}>
              <Text style={styles.allocationLabel}>Tokens</Text>
              <Text style={styles.allocationValue}>
                {tokenBalance.toFixed(2)}g
              </Text>
            </View>
          </View>

          {isPriceLoading && priceHistory.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading chart data...</Text>
            </View>
          ) : (
            <MarketLineChart
              points={portfolioPoints}
              lineColor={Colors.primaryLight}
              fillColor={Colors.primary}
              valueLabel="Live portfolio value"
              formatValue={formatCurrency}
              formatAxisValue={formatAxisCurrency}
              formatTimelineLabel={formatTimelineLabel}
              footerValueLabel="Timeline portfolio move"
              footerChangeColor={chartStats.changeColor}
              footerChangePrefix={chartStats.changePrefix}
              footerChangeValue={Math.abs(chartStats.change)}
            />
          )}

          {priceHistory.length === 0 && (
            <Text style={styles.fallbackNote}>
              Showing a live baseline until synced history is available.
            </Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Timeline change</Text>
            <Text style={[styles.statValue, { color: chartStats.changeColor }]}>
              {chartStats.changePrefix}
              {formatCurrency(Math.abs(chartStats.change))}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tracked P/L</Text>
            <Text
              style={[
                styles.statValue,
                { color: trackedProfitLossMeta.color },
              ]}
            >
              {trackedProfitLossMeta.prefix}
              {Math.abs(profitLoss.percentage).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cash balance</Text>
            <Text style={styles.statValue}>{formatCurrency(cashBalance)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gold value</Text>
            <Text style={styles.statValue}>
              {formatCurrency(chartStats.goldValue)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={styles.statValue}>{formatCurrency(chartStats.min)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={styles.statValue}>{formatCurrency(chartStats.max)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
          disabled={isRefreshing}
        >
          <Text style={styles.refreshButtonText}>
            {isRefreshing ? 'Refreshing...' : 'Refresh chart'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: hp(1.5),
    paddingBottom: hp(14),
  },
  header: {
    marginBottom: hp(2),
  },
  eyebrow: {
    color: Colors.primaryLight,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: hp(0.4),
  },
  title: {
    color: Colors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: normalize(20),
    marginTop: hp(0.8),
  },
  heroCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: wp(3.7),
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.2),
  },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  heroValue: {
    color: Colors.text,
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    marginTop: hp(0.7),
  },
  changePill: {
    borderRadius: BorderRadius.round,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
  },
  changePillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.8),
    marginBottom: hp(1.2),
  },
  allocationItem: {
    flex: 1,
  },
  allocationLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    marginBottom: hp(0.35),
  },
  allocationValue: {
    color: Colors.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  allocationDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: wp(2.2),
  },
  loadingBox: {
    minHeight: hp(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: hp(1),
  },
  fallbackNote: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    marginTop: hp(1),
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSize.sm,
    marginTop: hp(1.3),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: hp(1.8),
  },
  statCard: {
    width: '48.2%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: wp(3.7),
    marginBottom: hp(1.4),
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: hp(0.7),
  },
  statValue: {
    color: Colors.text,
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
  },
  refreshButton: {
    minHeight: hp(5.4),
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.4),
  },
  refreshButtonText: {
    color: Colors.text,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../types';
import { walletService } from '../services/walletService';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * ============================================================================
 * HISTORY SCREEN
 * ============================================================================
 */

interface HistoryScreenProps {
  navigation: any;
}

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'TRANSFER';
  tokens: number;
  pricePerToken: number;
  totalValue: number;
  timestamp: Date;
  senderId?: string;
  receiverId?: string;
  receiverEmail?: string;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSentTransfer = (transaction: Transaction): boolean =>
    transaction.type === 'TRANSFER' &&
    (transaction.senderId === user?.uid || Boolean(transaction.receiverEmail));

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTransactions = async () => {
      try {
        const history = await walletService.getTransactionHistory(user.uid, 50);
        if (isMounted) {
          setTransactions(history);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();

    const unsubscribe = walletService.subscribeToTransactions(
      user.uid,
      updatedTransactions => {
        if (isMounted) {
          setTransactions(updatedTransactions);
          setIsLoading(false);
        }
      },
    );

    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const handleRefresh = async () => {
    if (!user?.uid) return;

    setIsRefreshing(true);
    try {
      const history = await walletService.getTransactionHistory(user.uid, 50);
      setTransactions(history);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTransactionType = (
    transaction: Transaction,
  ): { label: string; color: string; icon: string } => {
    switch (transaction.type) {
      case 'BUY':
        return { label: 'BUY', color: Colors.success, icon: '📈' };
      case 'SELL':
        return { label: 'SELL', color: Colors.danger, icon: '📉' };
      case 'TRANSFER':
        const isSent = isSentTransfer(transaction);
        return {
          label: isSent ? 'SENT' : 'RECEIVED',
          color: isSent ? Colors.warning : Colors.success,
          icon: isSent ? '↗️' : '↙️',
        };
      default:
        return { label: 'UNKNOWN', color: Colors.textMuted, icon: '❓' };
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const typeInfo = getTransactionType(item);
    const isSent = isSentTransfer(item);

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: typeInfo.color + '20' },
            ]}
          >
            <Text style={styles.typeIconEmoji}>{typeInfo.icon}</Text>
          </View>
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionType, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={styles.transactionTokens}>
            {isSent ? '-' : '+'}
            {item.tokens.toFixed(2)}
          </Text>
          <Text style={styles.transactionValue}>
            ${item.totalValue.toFixed(2)}
          </Text>
          {item.receiverEmail && isSent && (
            <Text style={styles.transactionRecipient} numberOfLines={1}>
              To: {item.receiverEmail}
            </Text>
          )}
          {item.type === 'TRANSFER' && !isSent && (
            <Text style={styles.transactionRecipient}>Received</Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📜</Text>
      <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyStateText}>
        Your transaction history will appear here
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.emptyStateButtonText}>Start Trading</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Transaction History</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={[
            styles.listContent,
            transactions.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingBottom: hp(7.5),
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: hp(2),
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: hp(1.5),
  },
  listContent: {
    padding: wp(4.3),
    paddingBottom: hp(13),
  },
  listContentEmpty: {
    flex: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: hp(1.5),
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: wp(10.6),
    height: wp(10.6),
    borderRadius: wp(5.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3.2),
  },
  typeIconEmoji: {
    fontSize: normalize(16),
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    marginBottom: hp(0.2),
  },
  transactionDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
    maxWidth: '40%',
  },
  transactionTokens: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: hp(0.2),
  },
  transactionValue: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  transactionRecipient: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    marginTop: hp(0.2),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(10.6),
  },
  emptyStateIcon: {
    fontSize: normalize(80),
    marginBottom: hp(2.6),
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: hp(1),
  },
  emptyStateText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(4),
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: wp(8.5),
    paddingVertical: hp(1.6),
    borderRadius: BorderRadius.md,
  },
  emptyStateButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.background,
  },
});

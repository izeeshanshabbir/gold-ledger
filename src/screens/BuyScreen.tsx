import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store/store';
import { buyTokens } from '../store/slices/walletSlice';
import { RootState } from '../types';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon } from '../components/Icons';

/**
 * ============================================================================
 * BUY SCREEN
 * ============================================================================
 */

interface BuyScreenProps {
  navigation: any;
}

export const BuyScreen: React.FC<BuyScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { cashBalance, currentGoldPrice } = useSelector(
    (state: RootState) => state.wallet
  );

  const [amountInCash, setAmountInCash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const cashAmount = parseFloat(amountInCash) || 0;
  const tokensToBuy = cashAmount > 0 ? cashAmount / currentGoldPrice : 0;
  const isValid =
    cashAmount > 0 && cashAmount <= cashBalance && amountInCash !== '';

  const handleBuy = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to continue');
      return;
    }

    if (!isValid) {
      Alert.alert(
        'Invalid Amount',
        'Please enter a valid amount within your balance'
      );
      return;
    }

    try {
      setIsProcessing(true);

      const result = await dispatch(buyTokens({
        uid: user.uid,
        amountInCash: cashAmount,
      }));

      if (buyTokens.fulfilled.match(result)) {
        Alert.alert(
          'Purchase Successful! 🎉',
          `You bought ${tokensToBuy.toFixed(2)} gold tokens for $${cashAmount.toFixed(2)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (buyTokens.rejected.match(result)) {
        Alert.alert('Purchase Failed', result.payload as string);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <BackIcon size={wp(5.3)} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Buy Gold Tokens</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.priceInfoCard}>
            <Text style={styles.priceInfoLabel}>Current Gold Price</Text>
            <Text style={styles.priceInfoValue}>
              ${currentGoldPrice.toFixed(2)}
              <Text style={styles.priceInfoUnit}>/g</Text>
            </Text>
            <Text style={styles.priceInfoSubtext}>
              Price updates every 10 seconds
            </Text>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>
              ${cashBalance.toFixed(2)}
            </Text>
            <Text style={styles.balanceSubtext}>Cash you can spend</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Amount to Spend ($)</Text>
            <TextInput
              style={styles.input}
              value={amountInCash}
              onChangeText={setAmountInCash}
              placeholder="Enter amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              editable={!isProcessing}
            />
          </View>

          {amountInCash !== '' && cashAmount > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>You will receive</Text>
              <Text style={styles.previewValue}>
                {tokensToBuy.toFixed(2)}
              </Text>
              <Text style={styles.previewUnit}>Gold Tokens</Text>
              <View style={styles.previewDivider} />
              <View style={styles.previewDetails}>
                <Text style={styles.previewDetailText}>
                  At ${currentGoldPrice.toFixed(2)}/g
                </Text>
              </View>
            </View>
          )}

          {amountInCash !== '' && (
            <View style={styles.validationSection}>
              {cashAmount > cashBalance && (
                <Text style={styles.errorText}>
                  ⚠️ Amount exceeds your available balance
                </Text>
              )}
              {cashAmount <= 0 && amountInCash !== '' && (
                <Text style={styles.errorText}>
                  ⚠️ Please enter a valid amount
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.buyButton,
              {
                backgroundColor: isValid
                  ? Colors.success
                  : Colors.backgroundCard,
                opacity: isProcessing ? 0.7 : 1,
              },
            ]}
            onPress={handleBuy}
            disabled={!isValid || isProcessing}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.buyButtonText,
                { color: isValid ? Colors.background : Colors.textMuted },
              ]}
            >
              {isProcessing ? 'Processing...' : 'Buy Tokens'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.noticeText}>
            Transaction will be recorded in your history
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(5.3),
    paddingBottom: hp(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2.6),
  },
  backButton: {
    width: wp(10.6),
    height: wp(10.6),
    borderRadius: wp(5.3),
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    width: wp(10.6),
  },
  priceInfoCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: hp(1.6),
  },
  priceInfoLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  priceInfoValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  priceInfoUnit: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  priceInfoSubtext: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    marginTop: hp(0.3),
  },
  balanceCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: hp(2.6),
  },
  balanceLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  balanceValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.success,
  },
  balanceSubtext: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    marginTop: hp(0.3),
  },
  inputSection: {
    marginBottom: hp(2.6),
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: hp(1),
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.6),
    fontSize: Typography.fontSize.md,
    color: Colors.text,
  },
  previewCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    marginBottom: hp(2.6),
  },
  previewLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  previewValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  previewUnit: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: Colors.primary + '30',
    width: '100%',
    marginVertical: hp(1),
  },
  previewDetails: {
    alignItems: 'center',
  },
  previewDetailText: {
    fontSize: normalize(11),
    color: Colors.textMuted,
  },
  validationSection: {
    marginBottom: hp(1.6),
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.danger,
  },
  buyButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: hp(2.1),
    alignItems: 'center',
    marginBottom: hp(1),
  },
  buyButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

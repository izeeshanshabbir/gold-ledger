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
import { sellTokens } from '../store/slices/walletSlice';
import { RootState } from '../types';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon } from '../components/Icons';

/**
 * ============================================================================
 * SELL SCREEN
 * ============================================================================
 */

interface SellScreenProps {
  navigation: any;
}

export const SellScreen: React.FC<SellScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { tokenBalance, currentGoldPrice } = useSelector(
    (state: RootState) => state.wallet
  );

  const [tokenAmount, setTokenAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const tokens = parseFloat(tokenAmount) || 0;
  const cashToReceive = tokens * currentGoldPrice;
  const isValid =
    tokens > 0 && tokens <= tokenBalance && tokenAmount !== '';

  const handleSell = async () => {
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

      const result = await dispatch(sellTokens({
        uid: user.uid,
        tokenAmount: tokens,
      }));

      if (sellTokens.fulfilled.match(result)) {
        Alert.alert(
          'Sale Successful! 🎉',
          `You sold ${tokens.toFixed(2)} gold tokens for $${cashToReceive.toFixed(2)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (sellTokens.rejected.match(result)) {
        Alert.alert('Sale Failed', result.payload as string);
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
            <Text style={styles.headerTitle}>Sell Gold Tokens</Text>
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
              {tokenBalance.toFixed(2)}
            </Text>
            <Text style={styles.balanceSubtext}>Gold Tokens you can sell</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Tokens to Sell</Text>
            <TextInput
              style={styles.input}
              value={tokenAmount}
              onChangeText={setTokenAmount}
              placeholder="Enter amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              editable={!isProcessing}
            />
          </View>

          {tokenAmount !== '' && tokens > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>You will receive</Text>
              <Text style={styles.previewValue}>
                ${cashToReceive.toFixed(2)}
              </Text>
              <Text style={styles.previewUnit}>Cash</Text>
              <View style={styles.previewDivider} />
              <View style={styles.previewDetails}>
                <Text style={styles.previewDetailText}>
                  At ${currentGoldPrice.toFixed(2)}/g
                </Text>
              </View>
            </View>
          )}

          {tokenAmount !== '' && (
            <View style={styles.validationSection}>
              {tokens > tokenBalance && (
                <Text style={styles.errorText}>
                  ⚠️ Amount exceeds your available balance
                </Text>
              )}
              {tokens <= 0 && tokenAmount !== '' && (
                <Text style={styles.errorText}>
                  ⚠️ Please enter a valid amount
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sellButton,
              {
                backgroundColor: isValid
                  ? Colors.success
                  : Colors.backgroundCard,
                opacity: isProcessing ? 0.7 : 1,
              },
            ]}
            onPress={handleSell}
            disabled={!isValid || isProcessing}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sellButtonText,
                { color: isValid ? Colors.background : Colors.textMuted },
              ]}
            >
              {isProcessing ? 'Processing...' : 'Sell Tokens'}
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
    color: Colors.primary,
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
    backgroundColor: Colors.success + '15',
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.success + '40',
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
    color: Colors.success,
  },
  previewUnit: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: Colors.success + '30',
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
  sellButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: hp(2.1),
    alignItems: 'center',
    marginBottom: hp(1),
  },
  sellButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

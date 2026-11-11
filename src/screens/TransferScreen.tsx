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
import { transferTokens } from '../store/slices/walletSlice';
import { RootState } from '../types';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon } from '../components/Icons';

/**
 * ============================================================================
 * TRANSFER SCREEN
 * ============================================================================
 */

interface TransferScreenProps {
  navigation: any;
}

export const TransferScreen: React.FC<TransferScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { tokenBalance, currentGoldPrice } = useSelector(
    (state: RootState) => state.wallet
  );

  const [receiverEmail, setReceiverEmail] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const tokens = parseFloat(tokenAmount) || 0;
  const isValidEmail = receiverEmail.includes('@') && receiverEmail.includes('.');
  const isValid =
    isValidEmail &&
    tokens > 0 &&
    tokens <= tokenBalance &&
    tokenAmount !== '' &&
    receiverEmail !== user?.email;

  const handleTransfer = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to continue');
      return;
    }

    if (!isValid) {
      if (!isValidEmail) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
      } else if (tokens <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid amount');
      } else if (tokens > tokenBalance) {
        Alert.alert('Insufficient Balance', 'You do not have enough tokens');
      } else if (receiverEmail === user.email) {
        Alert.alert('Invalid Recipient', 'You cannot transfer to yourself');
      }
      return;
    }

    try {
      setIsProcessing(true);

      const result = await dispatch(transferTokens({
        senderId: user.uid,
        receiverEmail: receiverEmail.trim().toLowerCase(),
        tokenAmount: tokens,
      }));

      if (transferTokens.fulfilled.match(result)) {
        Alert.alert(
          'Transfer Successful! 🎉',
          `You sent ${tokens.toFixed(2)} gold tokens to ${receiverEmail}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (transferTokens.rejected.match(result)) {
        Alert.alert('Transfer Failed', result.payload as string);
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
            <Text style={styles.headerTitle}>Transfer Tokens</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>
              {tokenBalance.toFixed(2)}
            </Text>
            <Text style={styles.balanceSubtext}>Gold Tokens you can send</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Recipient Email</Text>
            <TextInput
              style={styles.input}
              value={receiverEmail}
              onChangeText={setReceiverEmail}
              placeholder="Enter recipient's email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isProcessing}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Tokens to Send</Text>
            <TextInput
              style={styles.input}
              value={tokenAmount}
              onChangeText={setTokenAmount}
              placeholder="Enter amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              editable={!isProcessing}
            />
          </View>

          {receiverEmail !== '' && tokenAmount !== '' && tokens > 0 && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Transfer Summary</Text>

              <View style={styles.previewRow}>
                <Text style={styles.previewRowLabel}>To:</Text>
                <Text style={styles.previewRowValue} numberOfLines={1} ellipsizeMode="middle">
                  {receiverEmail.trim().toLowerCase()}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewRowLabel}>Amount:</Text>
                <Text style={styles.previewRowValue}>
                  {tokens.toFixed(2)} Gold Tokens
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewRowLabel}>Value:</Text>
                <Text style={styles.previewRowValue}>
                  ${(tokens * currentGoldPrice).toFixed(2)}
                </Text>
              </View>

              <View style={styles.previewDivider} />

              <Text style={styles.previewNotice}>
                This action cannot be undone
              </Text>
            </View>
          )}

          <View style={styles.validationSection}>
            {receiverEmail !== '' && !isValidEmail && (
              <Text style={styles.errorText}>
                ⚠️ Please enter a valid email address
              </Text>
            )}
            {receiverEmail !== '' && receiverEmail === user?.email && (
              <Text style={styles.errorText}>
                ⚠️ You cannot transfer to yourself
              </Text>
            )}
            {tokenAmount !== '' && tokens > tokenBalance && (
              <Text style={styles.errorText}>
                ⚠️ Amount exceeds your available balance
              </Text>
            )}
            {tokenAmount !== '' && tokens <= 0 && (
              <Text style={styles.errorText}>
                ⚠️ Please enter a valid amount
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.transferButton,
              {
                backgroundColor: isValid
                  ? Colors.primary
                  : Colors.backgroundCard,
                opacity: isProcessing ? 0.7 : 1,
              },
            ]}
            onPress={handleTransfer}
            disabled={!isValid || isProcessing}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.transferButtonText,
                { color: isValid ? Colors.background : Colors.textMuted },
              ]}
            >
              {isProcessing ? 'Processing...' : 'Send Tokens'}
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
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    padding: wp(4.3),
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    marginBottom: hp(2.6),
  },
  previewLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: hp(1),
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  previewRowLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  previewRowValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    maxWidth: '70%',
  },
  previewDivider: {
    height: 1,
    backgroundColor: Colors.primary + '30',
    width: '100%',
    marginVertical: hp(1),
  },
  previewNotice: {
    fontSize: normalize(11),
    color: Colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  validationSection: {
    marginBottom: hp(1),
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.danger,
  },
  transferButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: hp(2.1),
    alignItems: 'center',
    marginBottom: hp(1),
  },
  transferButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: normalize(10),
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

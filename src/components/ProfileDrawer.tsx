import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, deleteAccount } from '../store/slices/authSlice';
import { claimEmergencyFunds } from '../store/slices/walletSlice';
import { RootState } from '../types';
import { Colors, BorderRadius, Typography, normalize, wp, hp } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDispatch, persistor } from '../store/store';
import { Input } from './Input';
import { Links } from '../config/links';

interface ProfileDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isVisible,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading } = useSelector((state: RootState) => state.wallet);
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'User';
  const avatarInitial = displayName[0]?.toUpperCase() || 'U';

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const [shouldRender, setShouldRender] = React.useState(isVisible);

  // Account deletion is gated behind a password prompt: redux-persist keeps
  // sessions alive for weeks, so Firebase treats the login as stale and
  // requires reauthentication before it will delete the user.
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Drawer width
  const drawerWidth = wp(80);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      slideAnim.setValue(drawerWidth);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: drawerWidth,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [isVisible, slideAnim, fadeAnim, drawerWidth]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await dispatch(logoutUser()).unwrap();
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to logout');
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleEmergencyFunds = () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Unable to find your wallet right now.');
      return;
    }

    Alert.alert(
      'Emergency Funds',
      'Add $10,000 emergency funds to your cash balance?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add Funds',
          onPress: async () => {
            try {
              await dispatch(
                claimEmergencyFunds({
                  uid: user.uid,
                  amount: 10000,
                }),
              ).unwrap();

              Alert.alert(
                'Funds Added',
                '$10,000 has been added to your cash balance.',
              );
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to add emergency funds');
            }
          },
        },
      ],
    );
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setDeletePassword('');
    setDeleteError(null);
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, your cash and token balances, and your entire transaction history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setDeletePassword('');
            setDeleteError(null);
            setIsDeleteModalVisible(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await dispatch(deleteAccount({ password: deletePassword })).unwrap();

      // Drop the persisted cache too, otherwise redux-persist rehydrates the
      // deleted user's wallet and transactions on the next launch.
      await persistor.purge();

      setIsDeleting(false);
      closeDeleteModal();
      onClose();
    } catch (error: any) {
      setIsDeleting(false);
      setDeleteError(
        typeof error === 'string'
          ? error
          : 'Could not delete your account. Please try again.',
      );
    }
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open the link.');
    }
  };

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.overlayTouchable}
        activeOpacity={0.5}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.drawerContainerWrapper,
          {
            width: drawerWidth,
            transform: [
              {
                translateX: slideAnim,
              },
            ],
          },
        ]}
      >
        <SafeAreaView style={styles.drawerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {avatarInitial}
                  </Text>
                </View>
              </View>

              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>

              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyBadge}>Emergency Access</Text>
              <Text style={styles.emergencyTitle}>Manual $10,000 top-up</Text>
              <Text style={styles.emergencyDescription}>
                Add emergency funds only when you need them. This does not run automatically.
              </Text>

              <TouchableOpacity
                style={[
                  styles.emergencyButton,
                  isLoading && styles.emergencyButtonDisabled,
                ]}
                onPress={handleEmergencyFunds}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <Text style={styles.emergencyButtonIcon}>+</Text>
                <Text style={styles.emergencyButtonText}>
                  {isLoading ? 'Adding Funds...' : 'Get Emergency $10,000'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccountPress}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>

            <View style={styles.legalLinks}>
              <TouchableOpacity
                onPress={() => openLink(Links.privacyPolicy)}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => openLink(Links.deleteAccount)}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLinkText}>Deletion Help</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.disclaimerText}>
              Simulation only. Virtual money — no real gold or currency is
              traded.
            </Text>

            <Text style={styles.versionText}>v1.0.0</Text>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalDescription}>
              Enter your password to permanently delete{' '}
              {user?.email || 'your account'}.
            </Text>

            <Input
              label="Password"
              value={deletePassword}
              onChangeText={text => {
                setDeletePassword(text);
                if (deleteError) setDeleteError(null);
              }}
              placeholder="Your password"
              secureTextEntry
              error={deleteError || undefined}
              returnKeyType="done"
              onSubmitEditing={handleConfirmDelete}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeDeleteModal}
                activeOpacity={0.7}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalDeleteButton,
                  isDeleting && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                activeOpacity={0.85}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: 'row',
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: "transparent",
  },
  drawerContainerWrapper: {
    backgroundColor: Colors.backgroundSecondary,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: wp(4),
  },
  closeButtonText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  avatarContainer: {
    marginBottom: hp(1),
  },
  avatar: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  avatarInitial: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  userName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: hp(0.3),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: hp(1),
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  statusDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: hp(1.5),
    marginHorizontal: wp(4),
  },
  emergencyCard: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1.5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(2),
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '24',
  },
  emergencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.45),
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary + '22',
    color: Colors.primaryLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    marginBottom: hp(1.2),
  },
  emergencyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: hp(0.7),
  },
  emergencyDescription: {
    fontSize: Typography.fontSize.xs,
    lineHeight: normalize(18),
    color: Colors.textSecondary,
    marginBottom: hp(1.8),
  },
  emergencyButton: {
    minHeight: hp(6),
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonDisabled: {
    opacity: 0.7,
  },
  emergencyButtonIcon: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginRight: wp(2),
  },
  emergencyButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    paddingVertical: hp(1.5),
    backgroundColor: Colors.danger + '15',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  logoutIcon: {
    fontSize: Typography.fontSize.md,
    marginRight: wp(2),
  },
  logoutText: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.danger,
  },
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(4),
    marginTop: hp(-0.5),
    marginBottom: hp(1.5),
    paddingVertical: hp(1.2),
  },
  deleteAccountText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginHorizontal: wp(4),
  },
  legalLinkText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    lineHeight: normalize(16),
    color: Colors.textMuted,
    marginHorizontal: wp(6),
    marginTop: hp(1.5),
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginBottom: hp(2),
    marginTop: hp(1),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  modalCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: hp(1),
  },
  modalDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: normalize(20),
    color: Colors.textSecondary,
    marginBottom: hp(2),
  },
  modalActions: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(1),
  },
  modalButton: {
    flex: 1,
    minHeight: hp(6),
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalCancelButton: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  modalDeleteButton: {
    backgroundColor: Colors.danger,
  },
  modalDeleteText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
});

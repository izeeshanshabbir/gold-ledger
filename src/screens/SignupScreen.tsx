import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store/store';
import { signupUser } from '../store/slices/authSlice';
import { RootState } from '../types';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EmailIcon, LockIcon, UserIcon } from '../components/Icons';
import { Colors, Typography, normalize, wp, hp } from '../theme';
import { Links } from '../config/links';

interface SignupScreenProps {
  navigation: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateInputs = (): boolean => {
    if (!name.trim() || !email || !password || !confirmPassword) {
      setValidationError('Please fill in all fields');
      return false;
    }
    if (name.trim().length < 2) {
      setValidationError('Please enter your full name');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSignup = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      const result = await dispatch(
        signupUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      );
      if (signupUser.rejected.match(result)) {
        Alert.alert('Signup Failed', result.payload as string);
      }
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start your gold trading journey today
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            icon={<UserIcon size={wp(5)} color={Colors.textSecondary} />}
          />

          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<EmailIcon size={wp(5)} color={Colors.textSecondary} />}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            icon={<LockIcon size={wp(5)} color={Colors.textSecondary} />}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            icon={<LockIcon size={wp(5)} color={Colors.textSecondary} />}
          />

          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : null}

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={isLoading}
            fullWidth
            size="large"
            style={styles.signupButton}
          />

          <Text style={styles.policyText}>
            Gold Ledger is a trading simulation using virtual money. By creating
            an account you agree to our{' '}
            <Text
              style={styles.policyLink}
              onPress={() => Linking.openURL(Links.privacyPolicy)}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: wp(6.4),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: normalize(22),
  },
  form: {
    width: '100%',
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginBottom: hp(2),
    textAlign: 'center',
  },
  signupButton: {
    marginTop: hp(1),
  },
  policyText: {
    marginTop: hp(2),
    fontSize: Typography.fontSize.xs,
    lineHeight: normalize(17),
    color: Colors.textMuted,
    textAlign: 'center',
  },
  policyLink: {
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(3),
  },
  loginText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});

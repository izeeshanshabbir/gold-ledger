import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store/store';
import { loginUser, clearError } from '../store/slices/authSlice';
import { RootState } from '../types';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EmailIcon, LockIcon } from '../components/Icons';
import { Colors, Typography, normalize, wp, hp } from '../theme';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateInputs = (): boolean => {
    if (!email || !password) {
      setValidationError('Please fill in all fields');
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

  const handleLogin = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.rejected.match(result)) {
        Alert.alert('Login Failed', result.payload as string);
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    }
  };

  React.useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Login to continue your gold trading journey
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Enter your password"
            secureTextEntry
            icon={<LockIcon size={wp(5)} color={Colors.textSecondary} />}
          />

          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : null}

          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
    marginBottom: hp(6),
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
  loginButton: {
    marginTop: hp(1),
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(3),
  },
  signupText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});

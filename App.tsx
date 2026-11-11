/**
 * Gold Tokenization Trading App
 * A React Native app for learning gold trading
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { store, persistor } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { checkAuthState } from './src/store/slices/authSlice';
import { initializeWallet } from './src/store/slices/walletSlice';
import { Colors, Typography } from './src/theme';

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    /**
     * APP INITIALIZATION
     * Runs once when app starts
     */
    const initializeApp = async () => {
      try {
        await Promise.all([
          // Fetch initial price from Firebase
          store.dispatch(initializeWallet()),
          // Check auth state (is user logged in?)
          store.dispatch(checkAuthState()),
        ]);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderTitle}>Loading your wallet</Text>
        <Text style={styles.loaderSubtitle}>
          Checking account and market data...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loaderTitle: {
    marginTop: 16,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  loaderSubtitle: {
    marginTop: 8,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default App;

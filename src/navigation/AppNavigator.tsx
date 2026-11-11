import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PriceChartScreen } from '../screens/PriceChartScreen';
import { PortfolioChartScreen } from '../screens/PortfolioChartScreen';
import { BuyScreen } from '../screens/BuyScreen';
import { SellScreen } from '../screens/SellScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { Colors, Typography, normalize, wp, hp } from '../theme';
import { StyleSheet, View } from 'react-native';
import {
  ChartIcon,
  HistoryIcon,
  HomeIcon,
  WalletIcon,
} from '../components/Icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: hp(0),
    height: hp(11),
    paddingTop: hp(3),
    borderTopWidth: 0,
    borderTopRightRadius: wp(7.2),
    borderTopLeftRadius: wp(7.2),
    backgroundColor: 'rgba(30, 30, 34, 0.96)',
  },
  iconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(4.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2.5),
  },
  iconWrapActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(162, 155, 254, 0.22)',
  },
  tabLabel: {
    fontSize: normalize(11),
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
});

const renderTabIcon = (
  IconComponent: React.ComponentType<{ size?: number; color?: string }>,
  color: string,
  focused: boolean,
) => (
  <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
    <IconComponent size={wp(5.5)} color={color} />
  </View>
);

export const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Buy" component={BuyScreen} />
      <Stack.Screen name="Sell" component={SellScreen} />
      <Stack.Screen name="Transfer" component={TransferScreen} />
    </Stack.Navigator>
  );
};

export const HistoryStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
};

export const PriceChartStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PriceChart" component={PriceChartScreen} />
    </Stack.Navigator>
  );
};

export const PortfolioChartStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PortfolioChart" component={PortfolioChartScreen} />
    </Stack.Navigator>
  );
};

// Bottom Tab Navigator
export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: Colors.background,
        },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            renderTabIcon(HomeIcon, color, focused)
          ),
        }}
      />
      <Tab.Screen
        name="PriceChart"
        component={PriceChartStack}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, focused }) => (
            renderTabIcon(ChartIcon, color, focused)
          ),
        }}
      />
      <Tab.Screen
        name="PortfolioChart"
        component={PortfolioChartStack}
        options={{
          tabBarLabel: 'Portfolio',
          tabBarIcon: ({ color, focused }) => (
            renderTabIcon(WalletIcon, color, focused)
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            renderTabIcon(HistoryIcon, color, focused)
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useResponsive } from '../hooks/useResponsive';
import { colors } from '../constants/theme';
import HomeStackNavigator from './HomeStackNavigator';
import LastNightStackNavigator from './LastNightStackNavigator';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Home: { outline: 'home', filled: 'home' },
  LastNight: { outline: 'film', filled: 'film' },
  Profile: { outline: 'user', filled: 'user' },
};

export default function BottomTabNavigator() {
  const { isWeb, isWideScreen, isWebPortalLayout } = useResponsive();
  const tabBarOnTop = isWeb && isWideScreen && !isWebPortalLayout;
  const hideTabBar = isWebPortalLayout;

  return (
    <Tab.Navigator
      initialRouteName="LastNight"
      tabBarPosition={tabBarOnTop ? 'top' : 'bottom'}
      tabBar={hideTabBar ? () => null : undefined}
      screenOptions={({ route }) => {
        const icons = tabIcons[route.name] || tabIcons.Home;
        const isFloating = !tabBarOnTop && Platform.OS !== 'web';
        return {
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Feather
              name={focused ? icons.filled : icons.outline}
              size={size}
              color={color}
            />
          ),
          tabBarStyle: isFloating
            ? {
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 18,
                borderRadius: 28,
                height: 58,
                paddingBottom: 6,
                backgroundColor: colors.surface + 'F0', // hafif transparan
                borderTopWidth: 0,
                shadowColor: '#000',
                shadowOpacity: 0.22,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                elevation: 14,
              }
            : {
                backgroundColor: colors.surface,
                borderTopColor: tabBarOnTop ? 'transparent' : colors.border,
                borderTopWidth: tabBarOnTop ? 0 : 1,
                borderBottomColor: tabBarOnTop ? colors.border : 'transparent',
                borderBottomWidth: tabBarOnTop ? 1 : 0,
              },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: Platform.OS === 'web' ? 14 : 12,
          },
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="LastNight"
        component={LastNightStackNavigator}
        options={{ title: 'Özet' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

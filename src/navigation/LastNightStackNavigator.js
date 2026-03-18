import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../constants/theme';
import LastNightSummaryScreen from '../screens/LastNight/LastNightSummaryScreen';
import ClipDetailScreen from '../screens/ClipDetail/ClipDetailScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: {
    backgroundColor: colors.app,
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontWeight: '700',
    fontSize: 17,
  },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.app },
};

const clipDetailScreenOptions = {
  title: 'Klip Detayı',
  headerBackTitleVisible: false,
  headerTintColor: colors.accent,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animation: 'slide_from_bottom',
  presentation: 'modal',
};

export default function LastNightStackNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name="LastNightSummary"
        component={LastNightSummaryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClipDetail"
        component={ClipDetailScreen}
        options={clipDetailScreenOptions}
      />
    </Stack.Navigator>
  );
}

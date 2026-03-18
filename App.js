import React, { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { ClipsProvider } from './src/context/ClipsContext';
import ResponsiveContainer from './src/components/ResponsiveContainer';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import TwitchLoginScreen from './src/screens/Auth/TwitchLoginScreen';

enableScreens(true);
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [authState, setAuthState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLoggedIn = (payload) => {
    // payload: { user, accessToken }
    setAuthState(payload);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClipsProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F0F' }} edges={['top', 'left', 'right']}>
            <ResponsiveContainer>
              {authState || isAdmin ? (
                <NavigationContainer>
                  <BottomTabNavigator />
                </NavigationContainer>
              ) : (
                <TwitchLoginScreen
                  onLoggedIn={handleLoggedIn}
                  onAdminLogin={() => setIsAdmin(true)}
                />
              )}
            </ResponsiveContainer>
          </SafeAreaView>
        </ClipsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

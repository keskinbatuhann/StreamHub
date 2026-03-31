import React, { useState, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { LogBox, Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { ClipsProvider } from './src/context/ClipsContext';
import ResponsiveContainer from './src/components/ResponsiveContainer';
import WebNavbar, { WEB_NAVBAR_HEIGHT } from './src/components/WebNavbar';
import WebPortalShell from './src/components/WebPortalShell';
import WebPortalSidebar from './src/components/WebPortalSidebar';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import TwitchLoginScreen from './src/screens/Auth/TwitchLoginScreen';
import { useResponsive } from './src/hooks/useResponsive';

const navigationRef = createNavigationContainerRef();

function getRootTabName(state) {
  if (!state?.routes?.length) return 'LastNight';
  return state.routes[state.index]?.name ?? 'LastNight';
}

function AuthenticatedApp({ webNavPad }) {
  const { isWebPortalLayout } = useResponsive();
  const [activeTab, setActiveTab] = useState('LastNight');

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const s = navigationRef.getRootState();
        if (s) setActiveTab(getRootTabName(s));
      }}
      onStateChange={() => {
        const s = navigationRef.getRootState();
        if (s) setActiveTab(getRootTabName(s));
      }}
    >
      <WebPortalShell
        showPortal={isWebPortalLayout}
        sidebar={
          <WebPortalSidebar
            activeRoute={activeTab}
            onNavigate={(name) => navigationRef.navigate(name)}
          />
        }
      >
        <ResponsiveContainer style={webNavPad ? { paddingTop: webNavPad } : undefined}>
          <BottomTabNavigator />
        </ResponsiveContainer>
      </WebPortalShell>
    </NavigationContainer>
  );
}

enableScreens(true);
WebBrowser.maybeCompleteAuthSession();
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture.',
]);

export default function App() {
  const [authState, setAuthState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const loginScreenRef = useRef(null);

  const handleLoggedIn = (payload) => {
    // payload: { user, accessToken }
    setAuthState(payload);
  };

  const isLoggedIn = !!(authState || isAdmin);
  const webNavPad = Platform.OS === 'web' ? WEB_NAVBAR_HEIGHT : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClipsProvider>
          <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
            <WebNavbar
              isLoggedIn={isLoggedIn}
              user={authState?.user}
              isAdminOnly={isAdmin && !authState}
              onLogout={() => {
                setAuthState(null);
                setIsAdmin(false);
              }}
              onLoginPress={() => loginScreenRef.current?.triggerLogin?.()}
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F0F' }} edges={['top', 'left', 'right']}>
              {authState || isAdmin ? (
                <AuthenticatedApp webNavPad={webNavPad} />
              ) : (
                <ResponsiveContainer style={webNavPad ? { paddingTop: webNavPad } : undefined}>
                  <TwitchLoginScreen
                    ref={loginScreenRef}
                    onLoggedIn={handleLoggedIn}
                    onAdminLogin={() => setIsAdmin(true)}
                  />
                </ResponsiveContainer>
              )}
            </SafeAreaView>
          </View>
        </ClipsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

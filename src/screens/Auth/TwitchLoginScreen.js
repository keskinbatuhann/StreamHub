import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as AuthSession from 'expo-auth-session';
import CustomButton from '../../components/CustomButton';

const TWITCH_CLIENT_ID = '65buha7i8z8g0lo6wyg3i1ebuh8ekq';
const TWITCH_AUTH_ENDPOINT = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_USER_ENDPOINT = 'https://api.twitch.tv/helix/users';

export default function TwitchLoginScreen({ onLoggedIn, onAdminLogin }) {
  const redirectUri = AuthSession.makeRedirectUri({
    // Expo Go + standalone için güvenli varsayılan
    useProxy: true,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: TWITCH_CLIENT_ID,
      scopes: ['user:read:email'],
      redirectUri,
      extraParams: {
        response_type: 'token',
      },
    },
    {
      authorizationEndpoint: TWITCH_AUTH_ENDPOINT,
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params || {};
      if (access_token) {
        fetchTwitchUser(access_token)
          .then((user) => {
            if (onLoggedIn && user) {
              onLoggedIn({ user, accessToken: access_token });
            }
          })
          .catch((e) => {
            console.warn('Twitch user fetch error', e);
          });
      }
    }
  }, [response, onLoggedIn]);

  const handleLogin = () => {
    if (!request) return;
    promptAsync({ useProxy: true, showInRecents: true });
  };

  return (
    <View style={styles.container}>
      {!!onAdminLogin && (
        <Pressable
          style={({ pressed }) => [styles.adminIconBtn, pressed && styles.adminButtonPressed]}
          onPress={onAdminLogin}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="shield" size={20} color="rgba(255,255,255,0.9)" />
        </Pressable>
      )}
      <Text style={styles.title}>StreamHub</Text>
      <Text style={styles.subtitle}>
        Devam etmek için giriş yöntemini seç.
      </Text>

      <View style={styles.buttonsWrap}>
        <CustomButton
          title="Twitch ile Giriş Yap"
          onPress={handleLogin}
          disabled={!request}
          loading={!request}
          style={styles.loginButtonWrap}
          icon={
            request ? (
              <Feather name="log-in" size={20} color="#FFFFFF" />
            ) : null
          }
        />

        {!!onAdminLogin && (
          <Pressable
            style={({ pressed }) => [styles.adminButton, pressed && styles.adminButtonPressed]}
            onPress={onAdminLogin}
          >
            <Text style={styles.adminButtonText}>Admin olarak devam et</Text>
          </Pressable>
        )}
      </View>

      {Platform.OS === 'web' && (
        <Text style={styles.footerTextSmall}>
          Web’de pop-up engelleyiciler açık ise, Twitch girişinden sonra adres çubuğunu kontrol et.
        </Text>
      )}
    </View>
  );
}

async function fetchTwitchUser(accessToken) {
  try {
    const res = await fetch(TWITCH_USER_ENDPOINT, {
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Twitch users error: ${res.status}`);
    }
    const json = await res.json();
    const user = Array.isArray(json.data) && json.data.length > 0 ? json.data[0] : null;
    return user;
  } catch (e) {
    console.warn('fetchTwitchUser error', e);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  adminIconBtn: {
    position: 'absolute',
    top: 36,
    right: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(10,10,20,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonsWrap: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    alignItems: 'center',
  },
  loginButtonWrap: {
    width: '100%',
  },
  footerText: {
    fontSize: 11,
    marginTop: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  adminButton: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(15,15,15,0.85)',
  },
  adminButtonPressed: {
    opacity: 0.85,
  },
  adminButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});


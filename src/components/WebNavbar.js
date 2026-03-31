import React from 'react';
import { View, Text, Image, Pressable, Platform, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const NAV_HEIGHT = 56;

export const WEB_NAVBAR_HEIGHT = NAV_HEIGHT;

/**
 * Web: sabit üst çubuk — logo solda, girişli kullanıcıda Twitch avatarı + çıkış; değilse Giriş Yap.
 */
export default function WebNavbar({ isLoggedIn, user, isAdminOnly, onLogout, onLoginPress }) {
  if (Platform.OS !== 'web') return null;

  const avatarUri = user?.profile_image_url;
  const displayName = user?.display_name || user?.login || '';

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.inner}>
        <View style={styles.left}>
          <Feather name="aperture" size={22} color="#A970FF" />
          <Text style={styles.logoText}>StreamHub</Text>
        </View>
        <View style={styles.right}>
          {isLoggedIn ? (
            <>
              <View style={styles.avatarWrap}>
                {isAdminOnly && !avatarUri ? (
                  <Feather name="shield" size={20} color="rgba(255,255,255,0.9)" />
                ) : avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarInitial}>{(displayName || 'U').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              {!!displayName && !isAdminOnly && (
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
              )}
              <Pressable
                onPress={onLogout}
                style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                hitSlop={8}
              >
                <Text style={styles.textBtnLabel}>Çıkış</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onLoginPress}
              style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed]}
              hitSlop={8}
            >
              <Text style={styles.loginBtnText}>Giriş Yap</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
    zIndex: 10000,
    backgroundColor: 'rgba(15,15,30,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    maxWidth: '100%',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E5E5FF',
  },
  name: {
    maxWidth: 160,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  textBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textBtnPressed: {
    opacity: 0.75,
  },
  textBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A970FF',
  },
  loginBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(169,112,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(169,112,255,0.45)',
  },
  loginBtnPressed: {
    opacity: 0.88,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E8DEFF',
  },
});

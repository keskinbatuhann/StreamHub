import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

export default function ExploreScreen() {
  const { isWeb, width } = useResponsive();
  const paddingHorizontal = isWeb && width >= 768 ? 48 : 24;

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal }]}
      style={styles.scroll}
    >
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Keşfet</Text>
      <Text style={styles.description}>
        Twitch ve Kick üzerindeki popüler yayıncı kliplerini keşfet.
      </Text>
    </ScrollView>
  );
}

const styles = {
  scroll: {
    flex: 1,
    backgroundColor: colors.app,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.app,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? '100%' : undefined,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
  },
};

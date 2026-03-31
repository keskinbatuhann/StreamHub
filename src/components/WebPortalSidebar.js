import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../constants/theme';
import { webCursorPointer, webHoverScaleStyle } from '../utils/webPortalStyles';

const NAV_ITEMS = [
  { name: 'Home', label: 'Ana Sayfa', icon: 'home' },
  { name: 'LastNight', label: 'Gece Özeti', icon: 'film' },
  { name: 'Profile', label: 'Profil', icon: 'user' },
];

/**
 * Web portal: sol %20 sabit menü (Ana Sayfa / Gece Özeti / Profil).
 */
export default function WebPortalSidebar({ activeRoute, onNavigate }) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.sidebar} accessibilityRole="navigation">
      <View style={styles.brand}>
        <Feather name="aperture" size={22} color={colors.accent} />
        <Text style={styles.brandText}>StreamHub</Text>
      </View>
      {NAV_ITEMS.map((item) => {
        const active = activeRoute === item.name;
        return (
          <Pressable
            key={item.name}
            onPress={() => onNavigate(item.name)}
            style={({ pressed, hovered }) => [
              styles.row,
              active && styles.rowActive,
              webCursorPointer,
              webHoverScaleStyle(hovered, 1.01),
              pressed && styles.rowPressed,
            ]}
          >
            <Feather
              name={item.icon}
              size={20}
              color={active ? colors.accent : 'rgba(255,255,255,0.65)'}
            />
            <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: '20%',
    minWidth: 200,
    maxWidth: 280,
    flexShrink: 0,
    backgroundColor: '#0C0C12',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: 'rgba(169,112,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(169,112,255,0.45)',
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  rowLabelActive: {
    color: '#FFFFFF',
  },
});

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '../constants/theme';

const PLATFORM = {
  twitch: { label: 'Twitch', color: colors.accent },
  kick: { label: 'Kick', color: colors.accentGreen },
};

/**
 * Letterboxd tarzı klip kartı:
 * - 16:9 thumbnail, 12px yuvarlatılmış köşe
 * - Sağ üst: yarı şeffaf kutu içinde ⭐ puan
 * - Sol alt: klibin süresi (0:30)
 * - Altında: kalın beyaz başlık, platform + yayıncı adı (küçük gri)
 */
export default function ClipCard({
  thumbnailUri,
  rating = 4.8,
  duration = '0:30',
  title,
  platform = 'twitch',
  streamerName,
  onPress,
  size = 'default',
  style,
}) {
  const platformInfo = PLATFORM[platform] || PLATFORM.twitch;
  const isLarge = size === 'large';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        isLarge && styles.wrapperLarge,
        pressed && styles.wrapperPressed,
        style,
      ]}
    >
      {/* Görsel alanı – 16:9, 12px radius */}
      <View style={styles.thumbContainer}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}

        {/* Sağ üst: puan */}
        <View style={styles.overlayBadgeTop}>
          <Text style={styles.overlayText}>⭐ {String(rating)}</Text>
        </View>

        {/* Sol alt: süre */}
        <View style={styles.overlayBadgeBottom}>
          <Text style={styles.overlayText}>{duration}</Text>
        </View>
      </View>

      {/* Alt bilgi: başlık + platform + yayıncı */}
      <Text style={[styles.title, isLarge && styles.titleLarge]} numberOfLines={2}>
        {title || 'Klip Başlığı'}
      </Text>
      <View style={styles.metaRow}>
        <View style={[styles.platformDot, { backgroundColor: platformInfo.color }]} />
        <Text style={[styles.metaText, isLarge && styles.metaTextLarge]}>{platformInfo.label}</Text>
        <Text style={styles.metaSeparator}>·</Text>
        <Text style={[styles.metaText, isLarge && styles.metaTextLarge, { marginRight: 0 }]} numberOfLines={1}>
          {streamerName || 'Yayıncı'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    marginBottom: 20,
  },
  wrapperPressed: {
    opacity: 0.92,
  },
  thumbContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: colors.surface,
  },
  overlayBadgeTop: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overlayBadgeBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overlayText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  wrapperLarge: {
    marginBottom: 0,
  },
  titleLarge: {
    fontSize: 18,
    marginTop: 12,
  },
  metaTextLarge: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: 6,
  },
  metaSeparator: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
};

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useClips } from '../context/ClipsContext';

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '120x120');
};

export default function ProfileShortcutButton({ compact = false }) {
  const navigation = useNavigation();
  const { currentUser, myQuotes } = useClips();

  const avatar =
    currentUser?.avatarUrl ||
    thumbnailUrl(myQuotes?.[0]?.thumbnail_url);

  const goToProfile = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('Profile');
      return;
    }
    navigation.navigate('Profile');
  };

  return (
    <Pressable
      onPress={goToProfile}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.avatarBorder}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="person-circle-outline" size={compact ? 26 : 30} color="#B9BAC7" />
          </View>
        )}
      </View>
      {!compact ? (
        <View style={styles.iconBadge}>
          <Ionicons name="person" size={11} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  avatarBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#A970FF',
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23242C',
  },
  iconBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A970FF',
    borderWidth: 1,
    borderColor: '#0F0F1E',
  },
});

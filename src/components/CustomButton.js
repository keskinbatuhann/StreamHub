import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';

const PURPLE = '#9146FF';

/**
 * Dribbble tarzı mor gölgeli, basınca hafif küçülen buton.
 * @param {string} title
 * @param {() => void} onPress
 * @param {React.ReactNode} [icon] — Sol tarafta gösterilir (örn. <Feather name="log-in" />)
 * @param {boolean} [disabled]
 * @param {boolean} [loading] — true iken spinner
 * @param {import('react-native').ViewStyle} [style] — dış sarmalayıcı (örn. { width: '100%' })
 * @param {import('react-native').TextStyle} [textStyle]
 */
export default function CustomButton({
  title,
  onPress,
  icon,
  disabled,
  loading,
  style,
  textStyle,
  testID,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const toPressed = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 6,
      tension: 400,
    }).start();
  }, [scale]);

  const toReleased = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 400,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={toPressed}
      onPressOut={toReleased}
      disabled={disabled || loading}
      style={style}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.button,
          { transform: [{ scale }] },
          (disabled || loading) && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.contentRow}>
            {icon != null ? <View style={styles.iconSlot}>{icon}</View> : null}
            <Text style={[styles.label, textStyle]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: PURPLE,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
        // Android’de mor gölge yaklaşımı
        shadowColor: PURPLE,
      },
      default: {
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    marginRight: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

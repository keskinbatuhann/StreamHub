import { Platform } from 'react-native';

/** Web: tıklanabilir öğelerde el işareti */
export const webCursorPointer = Platform.OS === 'web' ? { cursor: 'pointer' } : {};

/**
 * Pressable style callback ile kullanın: style={({ pressed, hovered }) => [...webHoverScale(hovered), ...]}
 * @param {boolean} hovered
 * @param {number} scale
 */
export function webHoverScaleStyle(hovered, scale = 1.02) {
  if (Platform.OS !== 'web' || !hovered) return null;
  return { transform: [{ scale }] };
}

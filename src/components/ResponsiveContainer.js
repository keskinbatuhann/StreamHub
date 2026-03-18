import React from 'react';
import { View } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { colors } from '../constants/theme';

/**
 * Web'de max genişlik + ortalama, mobilde tam genişlik.
 * Hem web hem mobilde aynı layout hissini verir.
 */
export default function ResponsiveContainer({ children, style }) {
  const { isWeb, contentMaxWidth } = useResponsive();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.app }]} pointerEvents="box-none">
      <View
        style={[
          { flex: 1, backgroundColor: colors.app },
          isWeb && contentMaxWidth != null && {
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
          style,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  );
}

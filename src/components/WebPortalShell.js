import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

/**
 * Web portal ana iskeleti: showPortal true iken satır düzeni — sol sidebar + sağ ana içerik (%80 alanı flex:1 ile doldurur).
 */
export default function WebPortalShell({ showPortal, sidebar, children }) {
  if (!showPortal || Platform.OS !== 'web') {
    return children;
  }

  return (
    <View style={styles.row}>
      {sidebar}
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    width: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
});

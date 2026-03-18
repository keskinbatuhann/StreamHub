import { useWindowDimensions, Platform } from 'react-native';
import { useState, useEffect } from 'react';

/** Web ve mobil uyumlu breakpoint'ler */
const BREAKPOINTS = {
  compact: 480,
  medium: 768,
  wide: 1024,
};

/**
 * Ekran boyutuna ve platforma göre responsive değerler döner.
 * Web'de içerik geniş ekranda ortalanıp max genişlikle sınırlanır.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWeb = Platform.OS === 'web';
  const w = mounted ? width : (isWeb ? 412 : 400);
  const isWideScreen = w >= BREAKPOINTS.medium;
  const isCompact = w < BREAKPOINTS.compact;

  return {
    width: w,
    height: mounted ? height : 700,
    isWeb,
    isWideScreen,
    isCompact,
    /** Web'de içerik sütunu için max genişlik (mobil-first, büyük ekranda ortalanır) */
    contentMaxWidth: isWeb ? BREAKPOINTS.compact : undefined,
    breakpoints: BREAKPOINTS,
  };
}

export default useResponsive;

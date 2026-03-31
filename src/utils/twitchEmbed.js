import { Platform } from 'react-native';

/**
 * Twitch embed iframe: `parent` yükleme alanıyla eşleşmeli.
 * - Web: .env veya tarayıcı host (prod domain).
 * - iOS/Android WebView: her zaman localhost (veya EXPO_PUBLIC_TWITCH_EMBED_PARENT_LOCAL);
 *   prod domain burada kullanılmamalı — Twitch embed reddeder.
 */
export function getTwitchEmbedParent() {
  if (Platform.OS === 'web') {
    const env = process.env.EXPO_PUBLIC_TWITCH_EMBED_PARENT;
    if (env && typeof env === 'string' && env.trim()) return env.trim();
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }
  const local = process.env.EXPO_PUBLIC_TWITCH_EMBED_PARENT_LOCAL;
  if (local && typeof local === 'string' && local.trim()) return local.trim();
  return 'localhost';
}

/** embed_url üzerinde parent= tek ve doğru olsun (çift parametre önlenir). */
export function withTwitchEmbedParent(embedUrl, parent) {
  if (!embedUrl || typeof embedUrl !== 'string') return embedUrl;
  try {
    const u = new URL(embedUrl);
    u.searchParams.set('parent', parent);
    return u.toString();
  } catch (_) {
    const sep = embedUrl.includes('?') ? '&' : '?';
    return `${embedUrl}${sep}parent=${encodeURIComponent(parent)}`;
  }
}

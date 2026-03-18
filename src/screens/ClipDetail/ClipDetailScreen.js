import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import LottieView from 'lottie-react-native';
import { colors } from '../../constants/theme';
import { abbreviateNumber } from '../../utils/format';
import { useClips } from '../../context/ClipsContext';

const STORAGE_PREFIX = 'streamhub_clip_';
const GOLD = '#FFD700';
const LIKE_RED = '#E53935';

/** Klip verisi: puan, beğeni, yorumlar. Anahtar = klip id. */
const getStorageKey = (clipId) => `${STORAGE_PREFIX}${clipId}`;

const defaultClipData = () => ({ rating: 0, comments: [] });

/** AsyncStorage'dan bu klibe ait veriyi oku (sayfa açıldığında). */
async function loadClipData(clipId) {
  if (!clipId) return defaultClipData();
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(clipId));
    if (!raw) return defaultClipData();
    const parsed = JSON.parse(raw);
    return {
      rating: Number(parsed.rating) || 0,
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch (_) {
    return defaultClipData();
  }
}

/** Puan, beğeni ve yorumları tek JSON olarak yerel hafızaya yaz. */
async function saveClipData(clipId, data) {
  if (!clipId) return;
  try {
    await AsyncStorage.setItem(getStorageKey(clipId), JSON.stringify(data));
  } catch (_) {}
}

/**
 * Twitch embed "parent" parametresi: yüklendiği host ile eşleşmeli.
 * .env'de EXPO_PUBLIC_TWITCH_EMBED_PARENT tanımlıysa onu kullan (örn. kendi domain'in).
 */
function getTwitchEmbedParent() {
  const envParent = process.env.EXPO_PUBLIC_TWITCH_EMBED_PARENT;
  if (envParent && typeof envParent === 'string' && envParent.trim()) {
    return envParent.trim();
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  try {
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri ?? '';
    const match = hostUri.match(/^(?:exp|exps?):\/\/([^:/]+)/);
    if (match && match[1]) return match[1];
  } catch (_) {}
  return 'localhost';
}

// TwitchPlayer: Web'de iframe, mobilde WebView (HTML + baseUrl).
function TwitchPlayer({ embedUrl, embedParent, style, onLoadEnd }) {
  if (!embedUrl) return null;
  const url =
    embedUrl +
    (embedUrl.includes('?') ? '&' : '?') +
    `parent=${encodeURIComponent(embedParent)}`;

  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: url,
      style: StyleSheet.flatten([
        {
          width: '100%',
          height: '100%',
          border: 0,
        },
        style,
      ]),
      allow: 'autoplay; fullscreen',
      title: 'Twitch player',
      onLoad: onLoadEnd,
    });
  }

  return (
    <WebView
      source={{
        html: `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>*{margin:0;padding:0;} body{background:#000;}</style>
</head>
<body>
  <iframe src="${url}" frameborder="0" allowfullscreen="true" scrolling="no" allow="autoplay; fullscreen" style="position:absolute;width:100%;height:100%;top:0;left:0;"></iframe>
</body>
</html>`,
        baseUrl: 'https://localhost',
      }}
      style={[style, { flex: 1, zIndex: 1 }]}
      scrollEnabled={false}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
      onLoadEnd={onLoadEnd}
    />
  );
}

export default function ClipDetailScreen({ navigation, route }) {
  const clip = route?.params?.clip || {};
  const clipId = clip.id ?? route?.params?.clipId ?? '';
  const clipTitle = clip.title ?? route?.params?.title ?? 'Seçili Klip';
  const clipEmbedUrl = clip.embed_url ?? route?.params?.clipEmbedUrl ?? null;

  const { currentUser, getClipSocial, toggleLike, repostClip, quoteClip } = useClips();
  const social = getClipSocial(clipId);
  const liked = social.liked;
  const likeCount = social.likeCount;
  const repostCount =
    Array.isArray(social.repostedBy) ? social.repostedBy.length : 0;
  const quoteCount =
    Array.isArray(social.quotes) ? social.quotes.length : 0;
  const hasReposted =
    !!currentUser && Array.isArray(social.repostedBy)
      ? social.repostedBy.includes(currentUser.name)
      : false;
  const hasQuoted =
    !!currentUser && Array.isArray(social.quotes)
      ? social.quotes.some((q) => q.authorName === currentUser.name)
      : false;

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [playerReady, setPlayerReady] = useState(false);

  const embedParent = getTwitchEmbedParent();

  // Klip değiştiğinde player yükleme durumunu sıfırla
  useEffect(() => {
    setPlayerReady(false);
  }, [clipId, clipEmbedUrl]);

  // Sayfa açıldığında bu klip id'sine ait kayıtlı yorumları çek
  useEffect(() => {
    if (!clipId) return;
    let cancelled = false;
    (async () => {
      const data = await loadClipData(clipId);
      if (cancelled) return;
      setComments(data.comments);
    })();
    return () => { cancelled = true; };
  }, [clipId]);

  const handleToggleLiked = useCallback(() => {
    toggleLike(clipId);
  }, [clipId, toggleLike]);

  const handleRepost = useCallback(() => {
    if (clip.id) repostClip(clip);
  }, [clip, repostClip]);

  const handleQuoteSubmit = useCallback(() => {
    const text = quoteText.trim();
    if (text && clip.id) {
      quoteClip(clip, text);
      setQuoteText('');
      setQuoteModalVisible(false);
    }
  }, [clip, quoteText, quoteClip]);

  // Gönder (yorum) basıldığında: listeye ekle, yerel hafızaya JSON olarak yaz
  const sendComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text) return;
    const newComment = {
      id: Date.now().toString(),
      text,
      date: new Date().toISOString(),
    };
    const next = [...comments, newComment];
    setComments(next);
    setCommentText('');
    const data = await loadClipData(clipId);
    await saveClipData(clipId, { ...data, comments: next });
  }, [clipId, commentText, comments]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videoWrapper}>
          {clipEmbedUrl ? (
            <TwitchPlayer
              embedUrl={clipEmbedUrl}
              embedParent={embedParent}
              style={styles.video}
              onLoadEnd={() => setPlayerReady(true)}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Feather name="video-off" size={40} color={colors.textSecondary} />
              <Text style={styles.videoPlaceholderText}>Video yok</Text>
            </View>
          )}
          {!playerReady && (
            <View style={styles.videoLoaderOverlay} pointerEvents="none">
              <LottieView
                source={require('../../../assets/lottie/logo-glow.json')}
                autoPlay
                loop
                style={{ width: 120, height: 120 }}
              />
            </View>
          )}
        </View>

        {/* Başlık: önden hafif fade-in */}
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.clipTitle}>{clipTitle}</Text>
        </Animated.View>

        {/* Aksiyon barı: başlıktan kısa süre sonra */}
        <Animated.View entering={FadeIn.duration(220).delay(80)}>
          <View style={styles.actionBar}>
            <Pressable
              onPress={handleToggleLiked}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <View style={[styles.actionIconCircle, liked && styles.actionIconCircleActive]}>
                <Feather
                  name="heart"
                  size={18}
                  color={liked ? LIKE_RED : colors.textSecondary}
                />
              </View>
              <Text style={[styles.actionLabel, liked && { color: LIKE_RED }]}>
                {abbreviateNumber(likeCount)}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRepost}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <View style={[styles.actionIconCircle, hasReposted && styles.actionIconCircleActive]}>
                <Feather
                  name="repeat"
                  size={18}
                  color={hasReposted ? colors.accentGreen : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  hasReposted && { color: colors.accentGreen },
                ]}
              >
                {abbreviateNumber(repostCount)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setQuoteModalVisible(true)}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <View style={[styles.actionIconCircle, hasQuoted && styles.actionIconCircleActive]}>
                <Feather
                  name="message-circle"
                  size={18}
                  color={hasQuoted ? GOLD : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  hasQuoted && { color: GOLD },
                ]}
              >
                {abbreviateNumber(quoteCount)}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Quote (Alıntı) modal */}
        <Modal visible={quoteModalVisible} transparent animationType="slide">
          <Pressable style={styles.quoteOverlay} onPress={() => setQuoteModalVisible(false)}>
            <View style={styles.quoteModal} onStartShouldSetResponder={() => true}>
              <Text style={styles.quoteModalTitle}>Alıntıyla paylaş</Text>
              <TextInput
                style={styles.quoteInput}
                placeholder="Yorumunu ekle..."
                placeholderTextColor={colors.textSecondary}
                value={quoteText}
                onChangeText={setQuoteText}
                multiline
                maxLength={280}
              />
              <View style={styles.quoteModalActions}>
                <Pressable onPress={() => setQuoteModalVisible(false)} style={styles.quoteCancelBtn}>
                  <Text style={styles.quoteCancelText}>İptal</Text>
                </Pressable>
                <Pressable onPress={handleQuoteSubmit} style={[styles.quoteSubmitBtn, !quoteText.trim() && styles.quoteSubmitDisabled]}>
                  <Text style={styles.quoteSubmitText}>Paylaş</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Yorumlar */}
        <Animated.View entering={FadeIn.duration(260).delay(220)}>
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Yorumlar</Text>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorum yaz..."
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline={false}
                maxLength={300}
              />
              <Pressable
                onPress={sendComment}
                style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
              >
                <Text style={styles.sendBtnText}>Gönder</Text>
              </Pressable>
            </View>
            {comments.length === 0 ? (
              <Text style={styles.emptyComments}>Henüz yorum yok.</Text>
            ) : (
              comments.map((item) => (
                <View key={item.id} style={styles.commentCard}>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              ))
            )}
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
  videoLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  clipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  actionBtn: {
    alignItems: 'center',
    minWidth: 80,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(127,86,217,0.5)',
    backgroundColor: 'rgba(15,15,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconCircleActive: {
    borderColor: '#7F56D9',
    backgroundColor: 'rgba(127,86,217,0.18)',
  },
  quoteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  quoteModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  quoteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  quoteInput: {
    backgroundColor: colors.app,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  quoteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  quoteCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quoteCancelText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  quoteSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  quoteSubmitDisabled: {
    opacity: 0.5,
  },
  quoteSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnPressed: {
    opacity: 0.85,
  },
  actionLabel: {
    fontSize: 13,
    color: 'rgba(229,229,255,0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  emptyComments: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

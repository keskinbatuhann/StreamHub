import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/theme';
import { abbreviateNumber } from '../../utils/format';
import { useClips } from '../../context/ClipsContext';
import { getAccessToken, fetchTopClips, CATEGORY_GAME_IDS } from '../../api/twitch';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '1280x720');
};

// Twitch thumbnail_url → .mp4 video URL dönüştürücü
const getMp4Url = (thumbnailUrl) => {
  if (!thumbnailUrl) return null;
  const parts = String(thumbnailUrl).split('-preview-');
  if (!parts[0]) return null;
  return `${parts[0]}.mp4`;
};

/** Twitch clip için doğrudan video URL'si.
 * Twitch CDN'de thumbnail_url genelde `...-preview-480x272.jpg` formatında,
 * aynı kökte `.mp4` olarak video bulunabiliyor.
 */
function getClipVideoUri(clip) {
  if (!clip?.thumbnail_url) return null;
  const url = clip.thumbnail_url;
  if (typeof url !== 'string') return null;
  // Örn: https://clips-media-assets2.twitch.tv/AT-cm%7C12345-xyz-preview-480x272.jpg
  // →    https://clips-media-assets2.twitch.tv/AT-cm%7C12345-xyz.mp4
  return url
    .replace(/-preview-\d+x\d+\.jpg$/i, '.mp4')
    .replace(/-preview\.jpg$/i, '.mp4');
}

function FlowVideo({ videoUri, thumbUri, isActive }) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
  });
  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);
  const [showPoster, setShowPoster] = useState(!!thumbUri);
  return (
    <>
      {showPoster && thumbUri ? (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={() => setShowPoster(false)}
      />
    </>
  );
}

function FlowItem({
  item,
  index,
  isActive,
  activeVideoId,
  itemHeight,
  onNext,
  onLike,
  onRepost,
  onComment,
  onShare,
  onAvatar,
  onScissors,
  social,
}) {
  const thumbUri = thumbnailUrl(item.thumbnail_url);
  const videoUri = getMp4Url(item.thumbnail_url);
  const liked = social?.liked ?? false;
  const likeCount = social?.likeCount ?? 0;
  const repostCount = Array.isArray(social?.repostedBy) ? social.repostedBy.length : 0;
  const quoteCount = Array.isArray(social?.quotes) ? social.quotes.length : 0;
  const hasRepost = repostCount > 0;
  const hasQuote = quoteCount > 0;

  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(onNext, 18000);
    return () => clearTimeout(t);
  }, [isActive, onNext]);

  return (
    <View style={[styles.cell, { height: itemHeight }]}>
      {videoUri ? (
        <FlowVideo videoUri={videoUri} thumbUri={thumbUri} isActive={item.id === activeVideoId} />
      ) : (
        <Image
          source={{ uri: thumbUri || undefined }}
          style={styles.thumbFull}
          resizeMode="cover"
        />
      )}

      <View style={styles.gradientBottom} pointerEvents="none" />
      <View style={styles.infoPanel} pointerEvents="none">
        <Text style={styles.clipTitle} numberOfLines={2}>
          {item.title || 'Klip'}
        </Text>
        <Text style={styles.broadcasterName}>{item.broadcaster_name || 'Yayıncı'}</Text>
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          onPress={() => onAvatar(item)}
          style={({ pressed }) => [styles.avatarBtn, pressed && styles.iconBtnPressed]}
        >
          <Image
            source={{ uri: thumbUri || undefined }}
            style={styles.avatarImg}
          />
        </Pressable>
        <Pressable
          onPress={() => onLike(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.iconBtnPressed]}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={28}
            color={liked ? colors.accentGreen : '#FFFFFF'}
          />
          <Text style={styles.actionText}>{abbreviateNumber(likeCount)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onRepost(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.iconBtnPressed]}
        >
          <Ionicons
            name="repeat"
            size={26}
            color={hasRepost ? colors.accentGreen : '#FFFFFF'}
          />
          <Text style={styles.actionText}>{abbreviateNumber(repostCount)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onScissors(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.iconBtnPressed]}
        >
          <Ionicons
            name="cut-outline"
            size={26}
            color={hasQuote ? colors.accentGreen : '#FFFFFF'}
          />
          <Text style={styles.actionText}>{abbreviateNumber(quoteCount || 0)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onComment(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.iconBtnPressed]}
        >
          <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
          <Text style={styles.actionText}>{abbreviateNumber(quoteCount || 0)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onShare(item)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.iconBtnPressed]}
        >
          <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
          <Text style={styles.actionText}>{abbreviateNumber(0)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FlowScreen() {
  const navigation = useNavigation();
  const { getClipSocial, toggleLike, repostClip, quoteClip } = useClips();
  const insets = useSafeAreaInsets();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewableIndex, setViewableIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [commentModalClip, setCommentModalClip] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [scissorsModalClip, setScissorsModalClip] = useState(null);
  const [scissorsQuote, setScissorsQuote] = useState('');
  const listRef = useRef(null);
  const loadingRef = useRef(false);

  const itemHeight = WINDOW_HEIGHT - insets.top - insets.bottom;

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const token = await getAccessToken();
      const gameIds = Object.values(CATEGORY_GAME_IDS);
      const randomGameId = gameIds[Math.floor(Math.random() * gameIds.length)];
      const data = await fetchTopClips(token, randomGameId);
      const arr = Array.isArray(data) ? data : [];
      setClips((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const newOnes = arr.filter((c) => c.id && !ids.has(c.id));
        return prev.concat(newOnes);
      });
    } catch (_) {}
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const data = await fetchTopClips(token, null);
        if (!cancelled) setClips(Array.isArray(data) ? data : []);
      } catch (_) {
        if (!cancelled) setClips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // İlk yüklemede ilk klibi otomatik olarak aktif yap (oynasın)
  useEffect(() => {
    if (!activeVideoId && clips.length > 0) {
      setViewableIndex(0);
      setActiveVideoId(clips[0].id);
    }
  }, [clips, activeVideoId]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === 'number') {
        setViewableIndex(idx);
        const item = viewableItems[0].item;
        if (item?.id) setActiveVideoId(item.id);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 200,
  }).current;

  const scrollToNext = useCallback(() => {
    if (clips.length === 0) return;
    const next = Math.min(viewableIndex + 1, clips.length - 1);
    if (next <= viewableIndex) return;
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, [viewableIndex, clips.length]);

  const handleLike = useCallback(
    (clip) => {
      if (clip?.id) toggleLike(clip.id);
    },
    [toggleLike]
  );

  const handleRepost = useCallback(
    (clip) => {
      if (clip) repostClip(clip);
    },
    [repostClip]
  );

  const handleComment = useCallback((clip) => {
    setCommentModalClip(clip);
    setCommentText('');
  }, []);

  const handleShare = useCallback(async (clip) => {
    const url = clip?.embed_url || clip?.url || `https://clips.twitch.tv/${clip?.id || ''}`;
    try {
      await Share.share({
        message: clip?.title ? `${clip.title}\n${url}` : url,
        url: url,
      });
    } catch (_) {}
  }, []);

  const handleAvatar = useCallback(
    (clip) => {
      if (!clip?.broadcaster_name) return;
      navigation.navigate('Home', {
        screen: 'HomeScreen',
        params: { prefillSearch: clip.broadcaster_name },
      });
    },
    [navigation]
  );

  const handleScissors = useCallback((clip) => {
    setScissorsModalClip(clip);
    setScissorsQuote('');
  }, []);

  const handleCommentSubmit = useCallback(() => {
    if (commentModalClip?.id && commentText.trim()) {
      quoteClip(commentModalClip, commentText.trim());
    }
    setCommentModalClip(null);
    setCommentText('');
  }, [commentModalClip, commentText, quoteClip]);

  const handleScissorsSubmit = useCallback(() => {
    if (scissorsModalClip?.id) {
      const text = scissorsQuote.trim() || 'Son 5 saniye · Klip Kesme';
      quoteClip(scissorsModalClip, text);
    }
    setScissorsModalClip(null);
    setScissorsQuote('');
  }, [scissorsModalClip, scissorsQuote, quoteClip]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <FlowItem
        item={item}
        index={index}
        isActive={viewableIndex === index}
        activeVideoId={activeVideoId}
        itemHeight={itemHeight}
        onNext={scrollToNext}
        onLike={handleLike}
        onRepost={handleRepost}
        onComment={handleComment}
        onShare={handleShare}
        onAvatar={handleAvatar}
        onScissors={handleScissors}
        social={getClipSocial(item.id)}
      />
    ),
    [
      viewableIndex,
      activeVideoId,
      scrollToNext,
      handleLike,
      handleRepost,
      handleComment,
      handleShare,
      handleAvatar,
      handleScissors,
      getClipSocial,
    ]
  );

  const onEndReached = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handleMomentumEnd = useCallback(
    (e) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const index = Math.round(offsetY / itemHeight);
      if (!Number.isFinite(index) || index < 0 || index >= clips.length) return;
      setViewableIndex(index);
      const current = clips[index];
      if (current?.id) setActiveVideoId(current.id);
    },
    [clips, itemHeight]
  );

  if (loading && clips.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={clips}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={itemHeight}
        snapToAlignment="start"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
      />

      <Modal visible={!!commentModalClip} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCommentModalClip(null)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Yorum</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Yorumunu yaz..."
              placeholderTextColor={colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={280}
            />
            <Pressable onPress={handleCommentSubmit} style={styles.sheetSubmit}>
              <Text style={styles.sheetSubmitText}>Gönder</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!scissorsModalClip} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setScissorsModalClip(null)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Klip Kesme (GIF Studio)</Text>
            <Text style={styles.sheetHint}>
              Son 5 saniyeyi alıntı olarak profilindeki Koleksiyonlar / Alıntılar bölümüne kaydedebilirsin.
            </Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Yorumunu ekle (isteğe bağlı)..."
              placeholderTextColor={colors.textSecondary}
              value={scissorsQuote}
              onChangeText={setScissorsQuote}
              multiline
              maxLength={280}
            />
            <Pressable onPress={handleScissorsSubmit} style={styles.sheetSubmit}>
              <Text style={styles.sheetSubmitText}>Profilime Ekle</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cell: {
    width: WINDOW_WIDTH,
    backgroundColor: '#111',
  },
  thumbFull: {
    width: '100%',
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    backgroundColor: 'transparent',
  },
  infoPanel: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 48,
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  broadcasterName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlay: {
    position: 'absolute',
    bottom: 180,
    right: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  iconBtnPressed: {
    opacity: 0.8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    marginBottom: 22,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sheetHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  sheetInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
    marginBottom: 12,
  },
  sheetSubmit: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

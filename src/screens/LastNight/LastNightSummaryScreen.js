import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TouchableOpacity,
  SectionList,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';

import { colors } from '../../constants/theme';
import { abbreviateNumber, formatDateDayMonthYear } from '../../utils/format';
import { useClipsData } from '../../hooks/useClipsData';
import { useResponsive } from '../../hooks/useResponsive';
import { getTwitchEmbedParent } from '../../utils/twitchEmbed';
import { webCursorPointer, webHoverScaleStyle } from '../../utils/webPortalStyles';

/** Twitch VOD id'si sadece rakam; klip id'si alfanumerik slug. */
function isTwitchClip(item) {
  const id = item?.id;
  if (!id) return false;
  return !/^\d+$/.test(String(id));
}

function normalizeTwitchId(rawId) {
  if (!rawId) return '';
  // Bazı API'ler VOD id'sini " v123456 " gibi döndürebiliyor.
  return rawId.toString().replace(/^v/i, '').trim();
}

/** Web'de iframe src için Twitch embed URL'i. */
function getTwitchEmbedUrl(id, parentHost, type = 'vod') {
  const parent =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : (parentHost || 'localhost');
  const encodedParent = encodeURIComponent(parent);
  const encodedId = encodeURIComponent(id);
  if (type === 'clip') {
    return `https://clips.twitch.tv/embed?clip=${encodedId}&parent=${encodedParent}`;
  }
  return `https://player.twitch.tv/?video=${encodedId}&parent=${encodedParent}`;
}

/**
 * Twitch Clip → clips.twitch.tv/embed?clip=ID&parent=...
 * Twitch VOD → player.twitch.tv/?video=ID&parent=...
 * parent: Platform.OS === 'web' ? window.location.hostname : 'localhost'
 */
function buildTwitchEmbedHtml(id, parentHost, type = 'vod') {
  const parent =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : (parentHost || 'localhost');
  const encodedParent = encodeURIComponent(parent);
  const encodedId = encodeURIComponent(id);

  // Clips: Twitch does not support JavaScript interactive embed; use iframe only.
  if (type === 'clip') {
    const embedSrc = `https://clips.twitch.tv/embed?clip=${encodedId}&parent=${encodedParent}`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>*{margin:0;padding:0;} body{background:#000;}</style>
</head>
<body>
  <iframe src="${embedSrc}" frameborder="0" allowfullscreen="true" scrolling="no" allow="autoplay; fullscreen" style="position:absolute;width:100%;height:100%;top:0;left:0;"></iframe>
</body>
</html>`;
  }

  // VOD: use official Twitch Embed SDK for player control and ENDED event.
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://player.twitch.tv/js/embed/v1.js"></script>
  <style>*{margin:0;padding:0;} body{background:#000;} #twitch-player{position:absolute;width:100%;height:100%;top:0;left:0;}</style>
</head>
<body>
  <div id="twitch-player"></div>
  <script>
(function(){
  var options = {
    width: '100%',
    height: '100%',
    video: ${JSON.stringify(id)},
    parent: [${JSON.stringify(parent)}],
    autoplay: true
  };
  var player = new Twitch.Player('twitch-player', options);
  player.addEventListener(Twitch.Player.READY, function(){
    player.setVolume(1);
  });
  player.addEventListener(Twitch.Player.ENDED, function(){
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage('VIDEO_ENDED');
    }
  });
})();
  </script>
</body>
</html>`;
}

/** Web: standart iframe (WebView sorunlarını önler). Mobil: react-native-webview. */
function TwitchEmbedView({ id, embedType, embedParent, style, onVideoEnded }) {
  const embedUrl = getTwitchEmbedUrl(id, embedParent, embedType);
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: embedUrl,
      style: StyleSheet.flatten([styles.iframeFill, style]),
      title: 'Twitch embed',
      allow: 'autoplay; fullscreen',
    });
  }
  const html = buildTwitchEmbedHtml(id, embedParent, embedType);
  return (
    <WebView
      source={{ html, baseUrl: 'https://localhost' }}
      style={[styles.fullScreenVideo, { flex: 1, zIndex: 1 }, style]}
      scrollEnabled={false}
      allowsFullscreenVideo
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
      onMessage={
        onVideoEnded
          ? (e) => {
              if (e?.nativeEvent?.data === 'VIDEO_ENDED') onVideoEnded();
            }
          : undefined
      }
    />
  );
}

/** Twitch duration "1h2m3s" veya "45m" → saniye. */
function parseTwitchDuration(str) {
  if (!str || typeof str !== 'string') return 60;
  let seconds = 0;
  const h = str.match(/(\d+)h/);
  const m = str.match(/(\d+)m/);
  const s = str.match(/(\d+)s/);
  if (h) seconds += parseInt(h[1], 10) * 3600;
  if (m) seconds += parseInt(m[1], 10) * 60;
  if (s) seconds += parseInt(s[1], 10);
  return seconds > 0 ? seconds : 60;
}

const PURPLE = '#9146FF';
const BACKGROUND = '#0F0F1E';
const CARD_HORIZONTAL_MARGIN = 10;
const PILL_SELECTED = '#9146FF';
const PILL_UNSELECTED = '#161616';

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '320x180');
};

/** Twitch clip thumbnail_url → .mp4 video URL */
function getClipVideoUri(clip) {
  if (!clip?.thumbnail_url) return null;
  const url = clip.thumbnail_url;
  if (typeof url !== 'string') return null;
  return url
    .replace(/-preview-\d+x\d+\.jpg$/i, '.mp4')
    .replace(/-preview\.jpg$/i, '.mp4');
}

const getTimeBucketLabel = (createdAt) => {
  if (!createdAt) return 'Diğer Anlar';
  const d = new Date(createdAt);
  const h = d.getHours();
  if (h >= 0 && h < 3) return 'Gece Yarısı';
  if (h >= 3 && h < 6) return 'Sabah Karşı';
  if (h >= 6 && h < 12) return 'Sabah';
  if (h >= 12 && h < 18) return 'Öğleden Sonra';
  if (h >= 18 && h < 24) return 'Prime Time';
  return 'Gündüz Yayını';
};

const CATEGORY_EMOJI = { Hepsi: '✨', Drama: '🎭', Oyun: '🎮', Fail: '💀' };

const EMOTE_IDS = {
  hesRight: '60ad429676735e58129e9247',
  kekw: '60ae46f276735e58129f635e',
  based: '60ae4a0776735e58129f79b6',
};

function isFromYesterday(dateLike) {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  return d >= yesterdayStart && d < todayStart;
}

function isFromLast7Days(dateLike) {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  return d >= weekStart && d < todayStart;
}

function InlineClipVideo({ videoUri }) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.cardThumbVideo}
      contentFit="cover"
      nativeControls={true}
    />
  );
}

function ClipCardItem({
  item,
  onOpenModal,
  isPlayingInline,
  onStartInlinePlay,
  onStopInlinePlay,
  webPortalLayout,
}) {
  const thumb = thumbnailUrl(item.thumbnail_url);
  const videoUri = getClipVideoUri(item);
  const title = item.title || 'Önemli An';
  const broadcasterName = item.broadcaster_name || 'Yayıncı';
  const views = item.view_count ?? 0;
  const dateStr = formatDateDayMonthYear(item.created_at);

  const handleThumbPress = useCallback(() => {
    if (isPlayingInline) {
      onStopInlinePlay();
    } else if (videoUri) {
      onStartInlinePlay(item.id);
    } else {
      onOpenModal(item);
    }
  }, [isPlayingInline, videoUri, item, onStartInlinePlay, onStopInlinePlay, onOpenModal]);

  const heroPortal = !!(webPortalLayout && isPlayingInline && videoUri);

  return (
    <View style={[styles.card, heroPortal && styles.cardPortalHero]}>
      <Pressable
        onPress={handleThumbPress}
        style={[styles.cardThumbWrap, heroPortal && styles.cardThumbWrapPortal]}
      >
        {isPlayingInline && videoUri ? (
          <InlineClipVideo videoUri={videoUri} />
        ) : thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.cardThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardThumb, styles.cardThumbPlaceholder]} />
        )}
        <View style={styles.thumbBadge}>
          <Text style={styles.thumbBadgeText}>{abbreviateNumber(views)} izlenme</Text>
        </View>
        {isPlayingInline && (
          <Pressable style={styles.inlineStopBtn} onPress={onStopInlinePlay}>
            <Ionicons name="stop-circle" size={28} color="#FFF" />
          </Pressable>
        )}
      </Pressable>
      <Pressable
        style={[styles.cardBody, heroPortal && styles.cardBodyPortal]}
        onPress={() => onOpenModal(item)}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardBroadcaster} numberOfLines={1}>
          {broadcasterName}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="eye-outline" size={14} color={PURPLE} />
          <Text style={styles.cardMetaText}>{abbreviateNumber(views)} izlenme</Text>
        </View>
        {dateStr ? (
          <Text style={styles.cardDate} numberOfLines={1}>
            {dateStr}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

export default function LastNightSummaryScreen({ navigation }) {
  const { clips, addClip, categories, loading, error, refetch } = useClipsData();
  const embedParent = getTwitchEmbedParent();
  const [modalClip, setModalClip] = useState(null);
  const [playAllQueue, setPlayAllQueue] = useState(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Hepsi');
  const [sortOrder, setSortOrder] = useState('popular'); // 'popular' | 'leastPopular'
  const [playingClipId, setPlayingClipId] = useState(null);
  const [showAddClipModal, setShowAddClipModal] = useState(false);
  const [addClipCaption, setAddClipCaption] = useState('');
  const [addClipTags, setAddClipTags] = useState('');
  const [addClipCategory, setAddClipCategory] = useState('Oyun');
  const [reactions, setReactions] = useState({
    hesRight: 0,
    kekw: 0,
    based: 0,
  });
  const [dateRange, setDateRange] = useState('yesterday'); // 'yesterday' | 'week'
  const { isWebPortalLayout } = useResponsive();

  const sorted = useMemo(() => {
    const list = [...clips].filter((c) => {
      if (!c.created_at) return false;
      if (dateRange === 'week') return isFromLast7Days(c.created_at);
      return isFromYesterday(c.created_at);
    });
    if (sortOrder === 'leastPopular') {
      return list.sort((a, b) => (Number(a.view_count) || 0) - (Number(b.view_count) || 0));
    }
    return list.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0));
  }, [clips, sortOrder, dateRange]);

  const filtered = useMemo(() => {
    if (activeCategory === 'Hepsi') return sorted;
    return sorted.filter((c) => c.category === activeCategory);
  }, [sorted, activeCategory]);

  const sections = useMemo(() => {
    return [{ title: 'Klipler', data: filtered }];
  }, [filtered]);

  const openClipDetail = useCallback(
    (clip) => {
      if (!clip) return;
      // Twitch clip ise detay sayfasına git, değilse (VOD vb.) eski modal davranışını koru
      if (isTwitchClip(clip)) {
        if (!navigation) return;
        navigation.navigate('ClipDetail', { clip });
      } else {
        setModalClip(clip);
      }
    },
    [navigation]
  );

  const closeModal = useCallback(() => {
    setModalClip(null);
  }, []);

  const startPlayAll = useCallback(() => {
    if (filtered.length === 0) return;
    setPlayAllQueue([...filtered]);
    setQueueIndex(0);
  }, [filtered]);

  const closePlayAll = useCallback(() => {
    setPlayAllQueue(null);
    setQueueIndex(0);
  }, []);

  const currentQueueClip = playAllQueue?.[queueIndex] ?? null;
  const hasNextInQueue = playAllQueue && queueIndex < playAllQueue.length - 1;
  const hasPrevInQueue = playAllQueue && queueIndex > 0;

  const goNextInQueue = useCallback(() => {
    if (!playAllQueue) return;
    if (queueIndex < playAllQueue.length - 1) {
      setQueueIndex((i) => i + 1);
    } else {
      closePlayAll();
    }
  }, [playAllQueue, queueIndex, closePlayAll]);

  const goPrevInQueue = useCallback(() => {
    if (!playAllQueue || queueIndex <= 0) return;
    setQueueIndex((i) => i - 1);
  }, [playAllQueue, queueIndex]);

  const startInlinePlay = useCallback((clipId) => {
    setPlayingClipId(clipId);
  }, []);

  const stopInlinePlay = useCallback(() => {
    setPlayingClipId(null);
  }, []);

  const openAddClipModal = useCallback(() => {
    setAddClipCaption('');
    setAddClipTags('');
    setAddClipCategory('Oyun');
    setShowAddClipModal(true);
  }, []);

  const closeAddClipModal = useCallback(() => {
    setShowAddClipModal(false);
    setAddClipCaption('');
    setAddClipTags('');
  }, []);

  const canSubmitClip = useMemo(() => {
    const caption = addClipCaption.trim();
    return caption.length >= 2;
  }, [addClipCaption]);

  const handleSubmitClip = useCallback(() => {
    if (!canSubmitClip) return;
    const title = addClipCaption.trim();
    const tags = addClipTags.trim().split(/\s*[,]\s*/).filter(Boolean);
    addClip({
      title,
      broadcaster_name: 'Sen',
      view_count: 0,
      category: addClipCategory,
      tags,
    });
    closeAddClipModal();
  }, [addClip, addClipCaption, addClipCategory, addClipTags, closeAddClipModal, canSubmitClip]);

  const renderItem = useCallback(
    ({ item }) => (
      <ClipCardItem
        item={item}
        onOpenModal={openClipDetail}
        isPlayingInline={playingClipId === item.id}
        onStartInlinePlay={startInlinePlay}
        onStopInlinePlay={stopInlinePlay}
        webPortalLayout={false}
      />
    ),
    [playingClipId, openClipDetail, startInlinePlay, stopInlinePlay]
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const keyExtractor = (item, index) => `${item.id}-${index}`;

  const handleReact = useCallback((type) => {
    setReactions((prev) => ({
      ...prev,
      [type]: (prev[type] || 0) + 1,
    }));
  }, []);

  const isWeb = Platform.OS === 'web';
  const queueWebWide = isWebPortalLayout;

  const contentArea = loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingText}>Videolar yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : isWeb ? (
        <ScrollView
          style={styles.sectionList}
          contentContainerStyle={[styles.listContent, styles.listContentWeb]}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Klipler</Text>
          </View>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="moon-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeCategory === 'Hepsi'
                  ? 'Dün geceden çıkarılacak özel bir an bulunamadı.'
                  : 'Bu kategoriye ait klip yok.'}
              </Text>
            </View>
          ) : (
            <View style={styles.gridWrap}>
              {filtered.map((item, index) => (
                <View key={`${item.id}-${index}`} style={styles.gridItem}>
                  <ClipCardItem
                    item={item}
                    onOpenModal={openClipDetail}
                    isPlayingInline={playingClipId === item.id}
                    onStartInlinePlay={startInlinePlay}
                    onStopInlinePlay={stopInlinePlay}
                    webPortalLayout={isWebPortalLayout}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <SectionList
          style={styles.sectionList}
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          extraData={sortOrder}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="moon-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeCategory === 'Hepsi'
                  ? 'Dün geceden çıkarılacak özel bir an bulunamadı.'
                  : 'Bu kategoriye ait klip yok.'}
              </Text>
            </View>
          }
        />
      );

  const headerBlock = (
    <View style={styles.fixedHeader}>
      <View style={[styles.headerRowsWrap, isWeb && styles.headerRowsWrapWeb]}>
        <View style={styles.headerRow}>
          <Text style={styles.filterLabel}>Sıralama</Text>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setSortOrder('popular')}
              style={({ hovered }) => [
                styles.sortPill,
                sortOrder === 'popular' && styles.sortPillActive,
                webCursorPointer,
                webHoverScaleStyle(hovered, 1.03),
              ]}
            >
              <Text style={[styles.sortPillText, sortOrder === 'popular' && styles.sortPillTextActive]}>En Popüler</Text>
            </Pressable>
            <Pressable
              onPress={() => setSortOrder('leastPopular')}
              style={({ hovered }) => [
                styles.sortPill,
                sortOrder === 'leastPopular' && styles.sortPillActive,
                webCursorPointer,
                webHoverScaleStyle(hovered, 1.03),
              ]}
            >
              <Text style={[styles.sortPillText, sortOrder === 'leastPopular' && styles.sortPillTextActive]}>En Az Popüler</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.filterLabel}>Zaman</Text>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setDateRange('yesterday')}
              style={({ hovered }) => [
                styles.sortPill,
                dateRange === 'yesterday' && styles.sortPillActive,
                webCursorPointer,
                webHoverScaleStyle(hovered, 1.03),
              ]}
            >
              <Text style={[styles.sortPillText, dateRange === 'yesterday' && styles.sortPillTextActive]}>Dün</Text>
            </Pressable>
            <Pressable
              onPress={() => setDateRange('week')}
              style={({ hovered }) => [
                styles.sortPill,
                dateRange === 'week' && styles.sortPillActive,
                webCursorPointer,
                webHoverScaleStyle(hovered, 1.03),
              ]}
            >
              <Text style={[styles.sortPillText, dateRange === 'week' && styles.sortPillTextActive]}>Son 1 Hafta</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.playAllRow}>
        <TouchableOpacity
          onPress={startPlayAll}
          disabled={filtered.length === 0}
          activeOpacity={0.85}
          style={[styles.playAllButton, filtered.length === 0 && styles.playAllButtonDisabled]}
        >
          <Ionicons name="moon-outline" size={22} color="#FFFFFF" />
          <Text style={styles.playAllButtonText}>
            {dateRange === 'week' ? 'Haftalık Özet' : 'Gece Özeti'}
          </Text>
          {filtered.length > 0 && (
            <View style={styles.playAllCount}>
              <Text style={styles.playAllCountText}>{filtered.length} klip</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={openAddClipModal} activeOpacity={0.85} style={styles.addClipButton}>
          <Ionicons name="add-circle-outline" size={20} color={PURPLE} />
          <Text style={styles.addClipButtonText}>Klip Ekle</Text>
        </TouchableOpacity>
      </View>
      {(!isWeb || isWebPortalLayout) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={({ hovered }) => [
                  styles.filterChip,
                  { backgroundColor: isActive ? PILL_SELECTED : PILL_UNSELECTED },
                  webCursorPointer,
                  webHoverScaleStyle(hovered, 1.04),
                ]}
              >
                <Text style={styles.filterChipText}>{CATEGORY_EMOJI[cat.id] || ''} {cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {isWebPortalLayout ? (
        <View style={styles.portalMainSingle}>
          {headerBlock}
          {contentArea}
        </View>
      ) : isWeb ? (
        <View style={styles.webLayout}>
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Kategoriler</Text>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={({ hovered }) => [
                    styles.sidebarItem,
                    isActive && styles.sidebarItemActive,
                    webCursorPointer,
                    webHoverScaleStyle(hovered, 1.02),
                  ]}
                >
                  <Text style={styles.sidebarItemText}>
                    {CATEGORY_EMOJI[cat.id] || ''} {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.mainWrap}>
            <View style={styles.mainContent}>
              {headerBlock}
              {contentArea}
            </View>
          </View>
        </View>
      ) : (
        <>
          {headerBlock}
          {contentArea}
        </>
      )}

      {/* Tek klip / VOD modal + bilgi paneli */}
      <Modal visible={!!modalClip} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={closeModal} hitSlop={16}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {modalClip?.title || 'Klip'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.modalVideoWrapper}>
            {modalClip && (() => {
              const videoUri = getClipVideoUri(modalClip);
              const thumb = thumbnailUrl(modalClip.thumbnail_url);
              const videoId = normalizeTwitchId(modalClip.id);
              const hasTwitchEmbed =
                videoId && (modalClip.embed_url || isTwitchClip(modalClip));
              if (hasTwitchEmbed) {
                const embedType = isTwitchClip(modalClip) ? 'clip' : 'vod';
                return (
                  <View style={styles.embedPlayerShell}>
                    <TwitchEmbedView
                      id={videoId}
                      embedType={embedType}
                      embedParent={embedParent}
                      style={styles.modalVideo}
                    />
                    <EmoteBar onReact={handleReact} />
                  </View>
                );
              }
              if (videoUri) {
                return (
                  <View style={styles.embedPlayerShell}>
                    <SingleClipPlayer
                      uri={videoUri}
                      posterUri={thumb}
                      onClose={closeModal}
                      onReact={handleReact}
                    />
                  </View>
                );
              }
              return (
                <View style={styles.modalPlaceholder}>
                  <Ionicons name="videocam-off-outline" size={40} color={colors.textSecondary} />
                  <Text style={styles.modalPlaceholderText}>Bu an için video bulunamadı</Text>
                </View>
              );
            })()}
          </View>
          {modalClip && (
            <View style={styles.modalInfoPanel}>
              <Text style={styles.modalInfoTitle} numberOfLines={2}>
                {modalClip.title || 'Klip'}
              </Text>
              <Text style={styles.modalInfoBroadcaster}>
                {modalClip.broadcaster_name || 'Yayıncı'}
              </Text>
              <View style={styles.modalInfoMeta}>
                <Ionicons name="eye-outline" size={16} color={PURPLE} />
                <Text style={styles.modalInfoViews}>
                  {abbreviateNumber(modalClip.view_count ?? 0)} izlenme
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Kuyruk modu: Hepsini oynat modal */}
      <Modal
        visible={!!playAllQueue && playAllQueue.length > 0}
        animationType="slide"
        onRequestClose={closePlayAll}
      >
        <SafeAreaView style={styles.queueModalRoot} edges={['top', 'bottom']}>
          <View style={styles.queueModalHeader}>
            <Pressable
              onPress={closePlayAll}
              style={({ pressed }) => [styles.queueHeaderIconBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-down" size={26} color="rgba(255,255,255,0.92)" />
            </Pressable>
            {!queueWebWide ? (
              <View style={styles.queueHeaderCenter} pointerEvents="none">
                <Text style={styles.queueHeaderEyebrow}>Gece özeti</Text>
                <Text style={styles.queueHeaderTitle} numberOfLines={1}>
                  {currentQueueClip?.title || 'Klip'}
                </Text>
                {currentQueueClip && (
                  <Text style={styles.queueHeaderSub} numberOfLines={1}>
                    {currentQueueClip.broadcaster_name || 'Yayıncı'}
                    {' · '}
                    {abbreviateNumber(currentQueueClip.view_count ?? 0)} izlenme
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.queueHeaderCenterSpacer} />
            )}
            <Pressable onPress={closePlayAll} hitSlop={8} style={styles.queueHeaderKapat}>
              <Text style={styles.queueHeaderKapatText}>Kapat</Text>
            </Pressable>
          </View>

          <View style={[styles.queueModalBody, queueWebWide && styles.queueModalBodyWeb]}>
            <View style={[styles.queuePlayerCard, queueWebWide && styles.queuePlayerCardWeb]}>
              <View style={[styles.queueVideoArea, queueWebWide && styles.queueVideoAreaWeb]}>
                {currentQueueClip && (
                  <QueueClipPlayer
                    clip={currentQueueClip}
                    embedParent={embedParent}
                    onNext={goNextInQueue}
                    onReact={handleReact}
                    queueCardMode
                  />
                )}
              </View>
              {playAllQueue && playAllQueue.length > 0 && (
                queueWebWide ? (
                  <View style={styles.queueWebSidePanel}>
                    <View style={styles.queueWebSideMeta}>
                      <Text style={styles.queueHeaderEyebrow}>Gece özeti</Text>
                      <Text style={styles.queueWebSideTitle} numberOfLines={3}>
                        {currentQueueClip?.title || 'Klip'}
                      </Text>
                      {currentQueueClip && (
                        <Text style={styles.queueWebSideSub} numberOfLines={2}>
                          {currentQueueClip.broadcaster_name || 'Yayıncı'}
                          {' · '}
                          {abbreviateNumber(currentQueueClip.view_count ?? 0)} izlenme
                        </Text>
                      )}
                    </View>
                    <View style={styles.queueDockWebWrap}>
                      <QueueModeDock
                        playAllQueue={playAllQueue}
                        queueIndex={queueIndex}
                        onIndexChange={setQueueIndex}
                        goPrevInQueue={goPrevInQueue}
                        goNextInQueue={goNextInQueue}
                        hasPrevInQueue={hasPrevInQueue}
                        hasNextInQueue={hasNextInQueue}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.queueDockFloatingWrap}>
                    <QueueModeDock
                      playAllQueue={playAllQueue}
                      queueIndex={queueIndex}
                      onIndexChange={setQueueIndex}
                      goPrevInQueue={goPrevInQueue}
                      goNextInQueue={goNextInQueue}
                      hasPrevInQueue={hasPrevInQueue}
                      hasNextInQueue={hasNextInQueue}
                    />
                  </View>
                )
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Klip Ekle - Instagram tarzı gönderi modalı */}
      <Modal
        visible={showAddClipModal}
        animationType="slide"
        onRequestClose={closeAddClipModal}
      >
        <SafeAreaView style={styles.addClipModalContainer} edges={['top', 'bottom']}>
          <View style={styles.addClipModalHeader}>
            <Pressable onPress={closeAddClipModal} hitSlop={12}>
              <Text style={styles.addClipModalCancel}>İptal</Text>
            </Pressable>
            <Text style={styles.addClipModalTitle}>Yeni Klip</Text>
            <Pressable onPress={handleSubmitClip} hitSlop={12} disabled={!canSubmitClip}>
              <Text style={[styles.addClipModalSend, !canSubmitClip && styles.addClipModalSendDisabled]}>Gönder</Text>
            </Pressable>
          </View>
          <KeyboardAvoidingView
            style={styles.addClipModalBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              style={styles.addClipScroll}
              contentContainerStyle={styles.addClipScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.addClipPlaceholder}>
                <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.addClipPlaceholderText}>Klip görseli / video</Text>
                <Text style={styles.addClipPlaceholderHint}>İleride yükleme eklenebilir</Text>
              </View>
              <Text style={styles.addClipLabel}>Açıklama (en az 2 karakter, zorunlu)</Text>
              <TextInput
                style={styles.addClipCaptionInput}
                placeholder="Açıklama yaz..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={addClipCaption}
                onChangeText={setAddClipCaption}
                multiline
                maxLength={500}
                numberOfLines={4}
              />
              <Text style={styles.addClipLabel}>Etiketler (isteğe bağlı, virgülle ayır)</Text>
              <TextInput
                style={styles.addClipTagsInput}
                placeholder="#clutch, #fail, #drama"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={addClipTags}
                onChangeText={setAddClipTags}
                maxLength={120}
              />
              {!canSubmitClip && addClipCaption.trim().length > 0 && (
                <Text style={styles.addClipRequiredHint}>
                  Açıklama en az 2 karakter olmalı.
                </Text>
              )}
              <Text style={styles.addClipLabel}>Kategori</Text>
              <View style={styles.addClipCategoryRow}>
                {['Drama', 'Oyun', 'Fail'].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setAddClipCategory(cat)}
                    style={[
                      styles.addClipCategoryPill,
                      addClipCategory === cat && styles.addClipCategoryPillActive,
                    ]}
                  >
                    <Text style={[styles.addClipCategoryPillText, addClipCategory === cat && styles.addClipCategoryPillTextActive]}>
                      {CATEGORY_EMOJI[cat] || ''} {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              onPress={handleSubmitClip}
              disabled={!canSubmitClip}
              style={[styles.addClipSubmitBtn, !canSubmitClip && styles.addClipSubmitBtnDisabled]}
            >
              <Text style={styles.addClipSubmitBtnText}>Gönder</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SingleClipPlayer({ uri, posterUri, onClose, onReact }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.playerContainer}>
      <VideoView
        player={player}
        style={styles.fullScreenVideo}
        contentFit="contain"
        nativeControls={true}
        fullscreenOptions={{ enable: true }}
      />
      <EmoteBar onReact={onReact} />
    </View>
  );
}

function QueueNativeVideo({ videoUri, onNext, onReact, queueCardMode }) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
    p.play();
  });
  useEffect(() => {
    const sub = player.addListener('playToEnd', onNext);
    return () => sub.remove();
  }, [player, onNext]);
  if (queueCardMode) {
    return (
      <View style={styles.queueCardVideoShell}>
        <VideoView
          player={player}
          style={styles.queueCardVideo}
          contentFit="contain"
          nativeControls
          fullscreenOptions={{ enable: true }}
        />
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={styles.fullScreenVideo}
        contentFit="contain"
        nativeControls={true}
        fullscreenOptions={{ enable: true }}
      />
      <EmoteBar onReact={onReact} />
    </View>
  );
}

function QueueDockSlider({ queueLength, queueIndex, onIndexChange }) {
  const maxIdx = Math.max(0, queueLength - 1);
  return (
    <Slider
      style={styles.queueSlider}
      minimumValue={0}
      maximumValue={maxIdx}
      value={queueIndex}
      step={1}
      minimumTrackTintColor={PURPLE}
      maximumTrackTintColor="rgba(255,255,255,0.14)"
      thumbTintColor="#FFFFFF"
      trackStyle={styles.queueSliderTrackStyle}
      thumbStyle={styles.queueSliderThumbStyle}
      onSlidingComplete={(v) => onIndexChange(Math.round(v))}
    />
  );
}

function QueueModeDock({
  playAllQueue,
  queueIndex,
  onIndexChange,
  goPrevInQueue,
  goNextInQueue,
  hasPrevInQueue,
  hasNextInQueue,
}) {
  const inner = (
    <View style={styles.queueDockGlassInner}>
      <View style={styles.queueDockTop}>
        <QueueDockSlider
          queueLength={playAllQueue.length}
          queueIndex={queueIndex}
          onIndexChange={onIndexChange}
        />
        <Text style={styles.queueDockCounter}>
          {String(queueIndex + 1).padStart(2, '0')}
          <Text style={styles.queueDockCounterDim}>
            {' '}
            / {String(playAllQueue.length).padStart(2, '0')}
          </Text>
        </Text>
      </View>
      <View style={styles.queueDockControls}>
        <Pressable
          onPress={goPrevInQueue}
          disabled={!hasPrevInQueue}
          style={({ pressed }) => [
            styles.queueGlassBtn,
            !hasPrevInQueue && styles.queueGlassBtnDisabled,
            pressed && hasPrevInQueue && styles.queueGlassBtnPressed,
          ]}
        >
          <Ionicons name="play-skip-back" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={goNextInQueue}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={({ pressed }) => [styles.queueNextPillWrap, pressed && { opacity: 0.92 }]}
        >
          <LinearGradient
            colors={[PURPLE, '#6d28d9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.queueNextPill}
          >
            <Text style={styles.queueNextPillText}>
              {hasNextInQueue ? 'Sonraki klip' : 'Özeti bitir'}
            </Text>
            <Ionicons
              name={hasNextInQueue ? 'chevron-forward' : 'checkmark-circle'}
              size={12}
              color="#fff"
            />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.queueDockGlassCard, styles.queueDockGlassFallback]}>
        {inner}
      </View>
    );
  }
  return (
    <BlurView intensity={52} tint="dark" style={styles.queueDockGlassCard}>
      <View style={styles.queueDockGlassOverlay} pointerEvents="none" />
      {inner}
    </BlurView>
  );
}

function QueueClipPlayer({ clip, embedParent, onNext, onReact, queueCardMode }) {
  const timerRef = useRef(null);
  const videoUri = getClipVideoUri(clip);
  const clipId = normalizeTwitchId(clip?.id);
  const useEmbed = Boolean(clipId && (clip.embed_url || isTwitchClip(clip)));
  const embedType = isTwitchClip(clip) ? 'clip' : 'vod';
  const durationSec = parseTwitchDuration(clip?.duration);
  const durationMs = durationSec * 1000;

  useEffect(() => {
    if (!useEmbed) return undefined;
    if (embedType === 'vod' && Platform.OS !== 'web') return undefined;
    timerRef.current = setTimeout(() => {
      onNext();
    }, Math.min(durationMs, 4 * 60 * 1000));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [clip?.id, useEmbed, embedType, durationMs, onNext]);

  const embedNode = useEmbed ? (
    queueCardMode ? (
      <View style={styles.queueCardEmbedOuter}>
        <TwitchEmbedView
          id={clipId}
          embedType={embedType}
          embedParent={embedParent}
          style={styles.queueCardWebView}
          onVideoEnded={Platform.OS === 'web' ? undefined : onNext}
        />
      </View>
    ) : (
      <View style={[StyleSheet.absoluteFill, styles.embedPlayerShell]}>
        <TwitchEmbedView
          id={clipId}
          embedType={embedType}
          embedParent={embedParent}
          style={styles.fullScreenVideo}
          onVideoEnded={Platform.OS === 'web' ? undefined : onNext}
        />
        <EmoteBar onReact={onReact} />
      </View>
    )
  ) : null;

  const nativeNode = videoUri ? (
    <QueueNativeVideo
      videoUri={videoUri}
      onNext={onNext}
      onReact={onReact}
      queueCardMode={queueCardMode}
    />
  ) : null;

  const fallbackNode = (
    <View style={[styles.modalPlaceholder, queueCardMode && { flex: 1 }]}>
      <Ionicons name="videocam-off-outline" size={40} color={colors.textSecondary} />
      <Text style={styles.modalPlaceholderText}>Video yüklenemedi</Text>
      <Pressable onPress={onNext} style={styles.skipButton}>
        <Text style={styles.skipButtonText}>Sonraki</Text>
      </Pressable>
    </View>
  );

  if (embedNode) return embedNode;
  if (nativeNode) return nativeNode;
  return fallbackNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function EmoteBar({ onReact }) {
  const handlePress = useCallback(
    (type) => {
      if (onReact) {
        onReact(type);
      }
    },
    [onReact]
  );

  return (
    <View style={styles.emoteBar} pointerEvents="box-none">
      <View style={styles.emoteButtonWrap}>
        <EmoteButton emoteId={EMOTE_IDS.hesRight} onPress={() => handlePress('hesRight')} />
      </View>
      <View style={styles.emoteButtonWrap}>
        <EmoteButton emoteId={EMOTE_IDS.kekw} onPress={() => handlePress('kekw')} />
      </View>
      <View style={[styles.emoteButtonWrap, { marginBottom: 0 }]}>
        <EmoteButton emoteId={EMOTE_IDS.based} onPress={() => handlePress('based')} />
      </View>
    </View>
  );
}

function EmoteButton({ emoteId, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.1,
        friction: 4,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    }
  }, [onPress, scale]);

  return (
    <AnimatedPressable onPress={handlePress} style={{ transform: [{ scale }] }}>
      <Image
        source={{ uri: `https://cdn.7tv.app/emote/${emoteId}/2x.webp` }}
        style={styles.emoteImage}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#0E0E10',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 12,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(145,70,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(145,70,255,0.5)',
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainWrap: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  mainContent: {
    width: '100%',
    maxWidth: 1200,
    flex: 1,
    paddingHorizontal: 24,
  },
  fixedHeader: {
    zIndex: 1000,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRowsWrap: {},
  headerRowsWrapWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 6,
  },
  sortPillActive: {
    backgroundColor: 'rgba(145,70,255,0.4)',
    borderWidth: 1,
    borderColor: PURPLE,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: '70%',
    alignSelf: 'center',
    backgroundColor: PURPLE,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  playAllButtonDisabled: {
    opacity: 0.5,
  },
  playAllButtonPressed: {
    opacity: 0.9,
  },
  playAllButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playAllCount: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playAllCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  addClipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1F1F23',
    borderWidth: 1,
    borderColor: PURPLE,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addClipButtonPressed: {
    opacity: 0.85,
  },
  addClipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersScroll: {
    maxHeight: 44,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
    paddingBottom: 32,
  },
  listContentWeb: {
    flexDirection: 'column',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 32,
  },
  gridItem: {
    width: '33.333%',
    padding: 6,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: BACKGROUND,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    backgroundColor: '#141428',
    borderRadius: 24,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(127,86,217,0.4)',
    shadowColor: '#7F56D9',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  portalMainSingle: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  cardPortalHero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 320,
    minWidth: 0,
  },
  cardThumbWrapPortal: {
    flex: 1.85,
    minWidth: 0,
    width: undefined,
    height: undefined,
    minHeight: 320,
    marginRight: 16,
  },
  cardBodyPortal: {
    flex: 0.34,
    minWidth: 0,
    maxWidth: 380,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  cardThumbWrap: {
    width: 110,
    height: 72,
    minHeight: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#191919',
    marginRight: 12,
    position: 'relative',
  },
  cardThumb: {
    width: '100%',
    height: '100%',
    minHeight: 72,
  },
  cardThumbVideo: {
    width: '100%',
    height: '100%',
  },
  cardThumbPlaceholder: {
    backgroundColor: '#1E1E1E',
  },
  thumbBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  thumbBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inlineStopBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardBroadcaster: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: PURPLE,
    marginLeft: 4,
  },
  cardDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: PURPLE,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalVideoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  embedPlayerShell: {
    flex: 1,
    position: 'relative',
    minHeight: 200,
    overflow: 'hidden',
    borderRadius: 24,
  },
  modalVideo: {
    flex: 1,
  },
  modalInfoPanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(18,18,18,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalInfoBroadcaster: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  modalInfoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInfoViews: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
    marginLeft: 6,
  },
  iframeFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    border: 0,
    zIndex: 1,
  },
  fullScreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  playerContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 200,
    overflow: 'hidden',
    borderRadius: 24,
  },
  modalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PURPLE,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  queueModalRoot: {
    flex: 1,
    backgroundColor: '#050508',
  },
  queueModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  queueHeaderIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  queueHeaderCenter: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  queueHeaderCenterSpacer: {
    flex: 1,
    marginHorizontal: 8,
  },
  queueHeaderEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ADADB8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  queueHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    maxWidth: '100%',
  },
  queueHeaderSub: {
    fontSize: 13,
    color: '#ADADB8',
    marginTop: 4,
    fontWeight: '500',
    maxWidth: '100%',
  },
  queueHeaderKapat: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  queueHeaderKapatText: {
    fontSize: 15,
    fontWeight: '600',
    color: PURPLE,
  },
  queueModalBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  queueModalBodyWeb: {
    minHeight: 0,
  },
  queuePlayerCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#08080f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 14 },
    }),
  },
  queuePlayerCardWeb: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 0,
  },
  queueVideoArea: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#000',
  },
  queueVideoAreaWeb: {
    minWidth: 0,
    minHeight: 360,
    flex: 1.25,
  },
  queueWebSidePanel: {
    width: 300,
    maxWidth: '36%',
    flexShrink: 0,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  queueWebSideMeta: {
    marginBottom: 8,
  },
  queueWebSideTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 6,
    lineHeight: 22,
  },
  queueWebSideSub: {
    fontSize: 13,
    color: '#ADADB8',
    marginTop: 8,
    fontWeight: '500',
  },
  queueDockWebWrap: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  queueCardEmbedOuter: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  queueCardWebView: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    backgroundColor: '#000',
  },
  queueCardVideoShell: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  queueCardVideo: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    backgroundColor: '#000',
  },
  queueDockFloatingWrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  queueDockGlassCard: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      web: {
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      },
    }),
  },
  queueDockGlassFallback: {
    backgroundColor: 'rgba(31, 31, 35, 0.8)',
  },
  queueDockGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 31, 35, 0.72)',
    borderRadius: 22,
  },
  queueDockGlassInner: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  queueDockTop: {
    marginBottom: 16,
  },
  queueSlider: {
    width: '100%',
    height: 36,
  },
  queueSliderTrackStyle: {
    height: 4,
    borderRadius: 2,
  },
  queueSliderThumbStyle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  queueDockCounter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  queueDockCounterDim: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ADADB8',
  },
  queueDockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  queueGlassBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  queueGlassBtnDisabled: {
    opacity: 0.28,
  },
  queueGlassBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  queueNextPillWrap: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.22)',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  queueNextPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 34,
    gap: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  queueNextPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  addClipModalContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  addClipModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  addClipModalCancel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  addClipModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addClipModalSend: {
    fontSize: 16,
    fontWeight: '600',
    color: PURPLE,
  },
  addClipModalSendDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  addClipModalBody: {
    flex: 1,
  },
  addClipScroll: {
    flex: 1,
  },
  addClipScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  addClipPlaceholder: {
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  addClipPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  addClipPlaceholderHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  addClipCaptionInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  addClipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  addClipTagsInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  addClipRequiredHint: {
    fontSize: 12,
    color: 'rgba(255,180,100,0.95)',
    marginBottom: 12,
  },
  addClipCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  addClipCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: PILL_UNSELECTED,
  },
  addClipCategoryPillActive: {
    backgroundColor: PURPLE,
  },
  addClipCategoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  addClipCategoryPillTextActive: {
    color: '#FFFFFF',
  },
  addClipSubmitBtn: {
    backgroundColor: PURPLE,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addClipSubmitBtnDisabled: {
    opacity: 0.45,
  },
  addClipSubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emoteBar: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 999,
    ...(Platform.OS === 'android' && { elevation: 999 }),
  },
  emoteButtonWrap: {
    marginBottom: 10,
  },
  emoteImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

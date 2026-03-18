import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Animated,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AnimatedReanimated, { FadeIn } from 'react-native-reanimated';
import * as Linking from 'expo-linking';
import { colors } from '../../constants/theme';
import { useClips } from '../../context/ClipsContext';
import { abbreviateNumber } from '../../utils/format';

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '480x270');
};

const TABS = [
  { id: 'mine', label: 'Benim İçeriklerim' },
  { id: 'reposts', label: 'Repost' },
  { id: 'quotes', label: 'Requote' },
  { id: 'collections', label: 'Koleksiyonlar' },
];

const HEADER_SCROLL_RANGE = 140;
const STICKY_HEADER_HEIGHT = 56;

function openTwitch() {
  Linking.openURL('https://www.twitch.tv').catch(() => {});
}

function openDiscord() {
  Linking.openURL('https://discord.com').catch(() => {});
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentUser, myReposts, myQuotes, myOwnClips, collections } = useClips();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedTab, setSelectedTab] = useState('mine');

  const allClips = useMemo(() => {
    const map = new Map();
    (myReposts || []).forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    (myQuotes || []).forEach((c) => {
      if (c?.id) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [myReposts, myQuotes]);

  const filteredClips = useMemo(() => {
    if (selectedTab === 'reposts') return myReposts || [];
    if (selectedTab === 'quotes') return myQuotes || [];
    if (selectedTab === 'mine') return myOwnClips || [];
    return allClips;
  }, [selectedTab, myReposts, myQuotes, myOwnClips, allClips]);

  const profileAvatar = useMemo(() => {
    const candidate = allClips[0]?.thumbnail_url;
    return thumbnailUrl(candidate);
  }, [allClips]);

  const profileBanner = profileAvatar || null;
  const totalLikesApprox = useMemo(
    () => abbreviateNumber((myReposts?.length || 0) + (myQuotes?.length || 0)),
    [myReposts, myQuotes]
  );
  const followersApprox = abbreviateNumber(1234);
  const followingApprox = abbreviateNumber(321);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const onTabChange = (tabId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTab(tabId);
  };

  const openClip = (clip) => {
    if (!clip?.id) return;
    navigation.navigate('Home', { screen: 'ClipDetail', params: { clip } });
  };

  const goToExplore = () => {
    navigation.navigate('Home');
  };

  const stickyOpacity = scrollY.interpolate({
    inputRange: [80, HEADER_SCROLL_RANGE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderFeedItem = ({ item, index }) => {
    if (selectedTab === 'quotes') {
      const thumb = thumbnailUrl(item.thumbnail_url);
      return (
        <AnimatedReanimated.View entering={FadeIn.duration(220).delay(Math.min(index * 40, 200))}>
          <Pressable style={styles.quoteRowCard} onPress={() => openClip(item)}>
            <View style={styles.quoteThumbWrap}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.quoteThumbImg} resizeMode="cover" />
              ) : (
                <View style={[styles.quoteThumbImg, styles.feedThumbPlaceholder]} />
              )}
            </View>
            <View style={styles.quoteTextWrap}>
              {item.text ? (
                <Text style={styles.quoteMainText} numberOfLines={2}>
                  {item.text}
                </Text>
              ) : null}
              <Text style={styles.quoteClipTitle} numberOfLines={1}>
                {item.title || 'Klip'}
              </Text>
              <Text style={styles.quoteClipMeta} numberOfLines={1}>
                {item.broadcaster_name || 'Yayıncı'}
              </Text>
            </View>
          </Pressable>
        </AnimatedReanimated.View>
      );
    }
    const thumb = thumbnailUrl(item.thumbnail_url);
    const isQuoteItem = !!item.text;
    let typeLabel = null;
    if (selectedTab === 'reposts') typeLabel = 'Repost';
    else if (selectedTab === 'mine' || selectedTab === 'collections') typeLabel = isQuoteItem ? 'Requote' : 'Repost';
    return (
      <AnimatedReanimated.View entering={FadeIn.duration(200).delay(Math.min(index * 35, 180))} style={styles.feedItemWrapper}>
        <Pressable style={styles.feedItem} onPress={() => openClip(item)}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.feedThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.feedThumb, styles.feedThumbPlaceholder]} />
          )}
          {typeLabel && (
            <View style={[styles.feedTypeBadge, isQuoteItem && styles.feedTypeBadgeQuote]}>
              <Text style={styles.feedTypeBadgeText}>{typeLabel}</Text>
            </View>
          )}
          <View style={styles.feedViewsBadge}>
            <Text style={styles.feedViewsText}>{abbreviateNumber(item.view_count)}</Text>
          </View>
        </Pressable>
      </AnimatedReanimated.View>
    );
  };

  const ListHeaderComponent = (
    <View>
      <View style={styles.bannerWrap}>
        {profileBanner ? (
          <Image source={{ uri: profileBanner }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <View style={styles.bannerFallback} />
        )}
        <View style={styles.bannerOverlay} />
      </View>

      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarBorder}>
            {profileAvatar ? (
              <Image source={{ uri: profileAvatar }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]} />
            )}
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{followersApprox}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{followingApprox}</Text>
            <Text style={styles.statLabel}>Takip</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{totalLikesApprox}</Text>
            <Text style={styles.statLabel}>Beğeni</Text>
          </View>
        </View>
      </View>

      <View style={styles.bioSection}>
        <Text style={styles.usernameText}>{currentUser?.name || 'Kullanıcı'}</Text>
        <Text style={styles.bioText} numberOfLines={2}>
          Twitch klipleri, komik anlar ve highlight arşivi. StreamHub üzerinden kaydedildi.
        </Text>
        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn} onPress={openTwitch}>
            <Ionicons name="logo-twitch" size={18} color="#A970FF" />
            <Text style={styles.socialBtnText}>Twitch</Text>
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={openDiscord}>
            <Ionicons name="logo-discord" size={18} color="#5865F2" />
            <Text style={styles.socialBtnText}>Discord</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.collectionsSection}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const active = selectedTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [
                  styles.tabItem,
                  active && styles.tabItemActive,
                  pressed && styles.tabItemPressed,
                ]}
                onPress={() => onTabChange(tab.id)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.feedHeader}>
        <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
        <Text style={styles.feedHeaderText}>Klip Akışı</Text>
      </View>
    </View>
  );

  const emptyMessages = {
    reposts: 'Henüz hiçbir klibi repost etmedin.',
    quotes: 'Henüz hiçbir klibe alıntı eklemedin.',
    mine: 'Henüz bir şey paylaşılmadı.',
    collections: 'Henüz koleksiyonlara eklenmiş içerik yok.',
  };

  const ListEmptyComponent = (
    <AnimatedReanimated.View entering={FadeIn.duration(300)} style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="videocam-outline" size={44} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>Burada henüz içerik yok</Text>
      <Text style={styles.emptyText}>{emptyMessages[selectedTab] || emptyMessages.mine}</Text>
      <Pressable
        style={({ pressed }) => [styles.emptyCta, pressed && styles.emptyCtaPressed]}
        onPress={goToExplore}
      >
        <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
        <Text style={styles.emptyCtaText}>Keşfet & paylaş</Text>
      </Pressable>
    </AnimatedReanimated.View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top,
            height: STICKY_HEADER_HEIGHT + insets.top,
            opacity: stickyOpacity,
          },
        ]}
      >
        <View style={styles.stickyInner}>
          {profileAvatar ? (
            <Image source={{ uri: profileAvatar }} style={styles.stickyAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.stickyAvatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.stickyName} numberOfLines={1}>
            {currentUser?.name || 'Kullanıcı'}
          </Text>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={filteredClips}
        keyExtractor={(item) => item.id}
        key={`${selectedTab}-list`}
        numColumns={selectedTab === 'quotes' ? 1 : 3}
        renderItem={renderFeedItem}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={selectedTab === 'quotes' ? undefined : styles.columnWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  listContent: {
    paddingBottom: 40,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#0F0F1E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  stickyInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stickyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  stickyName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    flex: 1,
    backgroundColor: '#141428',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerRow: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -34,
    marginBottom: 12,
  },
  avatarWrap: { marginBottom: 8 },
  avatarBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#A970FF',
    padding: 2,
    backgroundColor: '#0F0F1E',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: '#1E1E1E',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 32,
    marginTop: 4,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  socialBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  collectionsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderRadius: 26,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#A970FF',
    borderColor: '#A970FF',
    shadowColor: '#A970FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabItemPressed: { opacity: 0.9 },
  tabLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  feedHeaderText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  columnWrapper: {
    paddingHorizontal: 2,
  },
  feedItemWrapper: {
    flex: 1,
  },
  feedItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    backgroundColor: '#141428',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#7F56D9',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  feedThumb: {
    width: '100%',
    height: '100%',
  },
  feedThumbPlaceholder: {
    backgroundColor: '#1E1E1E',
  },
  feedViewsBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  feedViewsText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  feedTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#A970FF',
  },
  feedTypeBadgeQuote: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: '#FFB347',
  },
  feedTypeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(169,112,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyCtaPressed: {
    opacity: 0.9,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quoteRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderLeftWidth: 3,
    borderLeftColor: '#A970FF',
  },
  quoteThumbWrap: {
    width: 90,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#111',
  },
  quoteThumbImg: {
    width: '100%',
    height: '100%',
  },
  quoteTextWrap: { flex: 1 },
  quoteMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quoteClipTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  quoteClipMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
});

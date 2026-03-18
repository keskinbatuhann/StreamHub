import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';
import { abbreviateNumber } from '../../utils/format';
import {
  getAccessToken,
  fetchTopClips,
  fetchClips,
  fetchClipsByPeriod,
  searchChannels,
  getChannelStats,
  fetchClipsByBroadcaster,
  CATEGORY_GAME_IDS,
} from '../../api/twitch';
import { useClips } from '../../context/ClipsContext';

const PADDING_H = 3;
const GRID_GAP = 8;
const CARD_RADIUS = 20;

const SORT_OPTIONS = [
  { id: 'popular', label: 'En Popüler' },
  { id: 'least_popular', label: 'En Az Popüler' },
  { id: 'newest', label: 'En Yeni' },
  { id: 'oldest', label: 'En Eski' },
];

const YEARS = [2026, 2025, 2024, 2023];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const CATEGORIES = [
  { id: 'all', label: 'Tümü', gameId: null },
  { id: 'just_chatting', label: 'Just Chatting', gameId: CATEGORY_GAME_IDS.just_chatting },
  { id: 'gaming', label: 'Gaming', gameId: CATEGORY_GAME_IDS.gaming },
  { id: 'music', label: 'Müzik', gameId: CATEGORY_GAME_IDS.music },
  { id: 'esport', label: 'E-Spor', gameId: CATEGORY_GAME_IDS.esport },
];

/**
 * Klipleri seçilen kritere göre sıralar. Tarih için new Date(created_at) kullanır.
 * Her zaman dizi döner (null/undefined dönmez).
 */
function sortClips(clips, option) {
  if (!Array.isArray(clips)) return [];
  const arr = [...clips];
  switch (option) {
    case 'popular':
      return arr.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0));
    case 'least_popular':
      return arr.sort((a, b) => (Number(a.view_count) || 0) - (Number(b.view_count) || 0));
    case 'newest':
      return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    default:
      return arr;
  }
}

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '480x270');
};

const formatClipDate = (createdAt) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  const day = date.getDate();
  const months = 'Oca Şub Mar Nis May Haz Tem Ağu Eyl Eki Kas Ara'.split(' ');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

function ClipGridCard({ item, onPress, social }) {
  const thumbUri = thumbnailUrl(item.thumbnail_url);
  const dateLabel = formatClipDate(item.created_at);
  const likeCount = social?.likeCount ?? 0;
  const repostedBy = social?.repostedBy ?? [];
  const viewCount = item.view_count ?? 0;
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.thumbWrap}>
        {thumbUri ? (
          <>
            <Image source={{ uri: thumbUri }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.viewTag}>
              <Feather name="eye" size={12} color="#E5E5FF" style={{ marginRight: 4 }} />
              <Text style={styles.viewTagText}>{abbreviateNumber(viewCount)}</Text>
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.thumbGradient}
            >
              <Text style={styles.thumbTitle} numberOfLines={1} ellipsizeMode="tail">
                {item.title || 'Klip'}
              </Text>
              <Text style={styles.thumbBroadcaster} numberOfLines={1} ellipsizeMode="tail">
                {item.broadcaster_name || 'Yayıncı'}
              </Text>
            </LinearGradient>
          </>
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </View>
      <View style={styles.cardInfo}>
        {repostedBy.length > 0 && (
          <View style={styles.repostBadge}>
            <Feather
              name="repeat"
              size={14}
              color={colors.textSecondary}
            />
          </View>
        )}
        {dateLabel ? <Text style={styles.dateLabel}>{dateLabel}</Text> : null}
        <View style={styles.metaRow}>
          <Feather
            name="user"
            size={14}
            color={colors.textSecondary}
            style={styles.metaIcon}
          />
          <Text style={styles.broadcaster} numberOfLines={1} ellipsizeMode="tail">
            {item.broadcaster_name || 'Yayıncı'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="heart" size={14} color={colors.accent} style={styles.metaIcon} />
          <Text style={styles.viewCount}>{abbreviateNumber(likeCount)} beğeni</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather
            name="eye"
            size={14}
            color={colors.textSecondary}
            style={styles.metaIcon}
          />
          <Text style={styles.viewCount}>{abbreviateNumber(item.view_count)} izlenme</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const paddingHorizontal = PADDING_H;
  const { getClipSocial, currentUser } = useClips();

  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [sortOption, setSortOption] = useState('popular');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('just_chatting');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedBroadcasterId, setSelectedBroadcasterId] = useState(null);
  const [channelStats, setChannelStats] = useState(null);
  const searchTimeoutRef = useRef(null);
  const listRef = React.useRef(null);
  const currentGameId = selectedCategory === 'all' ? null : (CATEGORIES.find((c) => c.id === selectedCategory)?.gameId ?? CATEGORY_GAME_IDS.just_chatting);

  const sortedClips = useMemo(() => {
    const result = sortClips(clips, sortOption);
    return Array.isArray(result) ? result : [];
  }, [clips, sortOption]);

  const filteredClips = useMemo(() => {
    if (selectedBroadcasterId) return sortedClips;
    if (!searchQuery.trim()) return sortedClips;
    const q = searchQuery.trim().toLowerCase();
    return sortedClips.filter(
      (clip) =>
        (clip.broadcaster_name && clip.broadcaster_name.toLowerCase().includes(q)) ||
        (clip.title && clip.title.toLowerCase().includes(q))
    );
  }, [sortedClips, searchQuery, selectedBroadcasterId]);

  // Android için LayoutAnimation'ı aktif et
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Kategori klipleri; yayıncı seçiliyse atla (arama temizlenince selectedBroadcasterId null olunca tekrar çalışır)
  useEffect(() => {
    if (selectedBroadcasterId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const gameId = selectedCategory === 'all' ? null : (CATEGORIES.find((c) => c.id === selectedCategory)?.gameId ?? CATEGORY_GAME_IDS.just_chatting);
        const data = await fetchTopClips(token, gameId);
        if (!cancelled && Array.isArray(data)) setClips(data);
        else if (!cancelled) setClips([]);
      } catch (_) {
        if (!cancelled) setClips([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCategory, selectedBroadcasterId]);

  // Arama: 3+ karakterde debounce ile otomatik ara
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setSearchResults([]);
      setChannelStats(null);
      setSelectedBroadcasterId(null);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchResults([]);
      setChannelStats(null);
      try {
        const token = await getAccessToken();
        const channels = await searchChannels(token, q);
        setSearchResults(Array.isArray(channels) ? channels : []);
      } catch (_) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // İlk arama sonucu için takipçi/izlenme istatistiklerini çek
  useEffect(() => {
    if (!searchResults.length) {
      setChannelStats(null);
      return;
    }
    const first = searchResults[0];
    if (!first?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const stats = await getChannelStats(token, first.id);
        if (!cancelled) setChannelStats(stats);
      } catch (_) {
        if (!cancelled) setChannelStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [searchResults]);

  const openClip = (clip) => {
    navigation.navigate('ClipDetail', { clip });
  };

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    setSearchLoading(true);
    setSearchResults([]);
    setChannelStats(null);
    try {
      const token = await getAccessToken();
      const channels = await searchChannels(token, q);
      setSearchResults(Array.isArray(channels) ? channels : []);
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setChannelStats(null);
    setSelectedBroadcasterId(null);
    setLoading(true);
  };

  const selectChannelForClips = async (channel) => {
    if (!channel?.id) return;
    setSelectedBroadcasterId(channel.id);
    setLoading(true);
    try {
      const token = await getAccessToken();
      const data = await fetchClipsByBroadcaster(token, channel.id);
      setClips(Array.isArray(data) ? data : []);
      listRef.current?.scrollTo?.({ y: 0, animated: true });
    } catch (_) {
      setClips([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (categoryId) => {
    if (categoryId === selectedCategory) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    setSelectedBroadcasterId(null);
    setSelectedCategory(categoryId);
    listRef.current?.scrollTo?.({ y: 0, animated: true });
  };

  const selectSortOption = async (optionId) => {
    setSortOption(optionId);
    setSelectedYear(null);
    setSelectedMonth(null);
    setExpandedSection(null);
    const apiType = { popular: 'popular', newest: 'new', oldest: 'old' }[optionId];
    const gameId = currentGameId || CATEGORY_GAME_IDS.just_chatting;
    if (apiType) {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const data = await fetchClips(token, apiType, gameId);
        setClips(Array.isArray(data) ? data : []);
      } catch (_) {
        setClips([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const selectYear = async (year) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setExpandedSection(null);
    const gameId = currentGameId || CATEGORY_GAME_IDS.just_chatting;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const started = new Date(year, 0, 1);
      const ended = new Date(year, 11, 31, 23, 59, 59);
      const data = await fetchClipsByPeriod(token, started, ended, gameId);
      setClips(Array.isArray(data) ? data : []);
    } catch (_) {
      setClips([]);
    } finally {
      setLoading(false);
    }
  };

  const selectMonth = async (monthIndex) => {
    const now = new Date();
    const year = now.getMonth() >= monthIndex ? now.getFullYear() : now.getFullYear() - 1;
    setSelectedYear(year);
    setSelectedMonth(monthIndex);
    setExpandedSection(null);
    const gameId = currentGameId || CATEGORY_GAME_IDS.just_chatting;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const started = new Date(year, monthIndex, 1);
      const ended = new Date(year, monthIndex + 1, 0, 23, 59, 59);
      const data = await fetchClipsByPeriod(token, started, ended, gameId);
      setClips(Array.isArray(data) ? data : []);
    } catch (_) {
      setClips([]);
    } finally {
      setLoading(false);
    }
  };

  const sortOptionLabel = SORT_OPTIONS.find((o) => o.id === sortOption)?.label || 'Sıralama Ölçütü';

  if (!hasLoadedOnce && loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <LottieView
          source={require('../../../assets/lottie/logo-glow.json')}
          autoPlay
          loop
          style={{ width: 160, height: 160 }}
        />
      </SafeAreaView>
    );
  }

  const categoryTitle = CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Klipler';
  const displayName = currentUser?.name || 'Yayıncı';
  const profileInitial = displayName?.charAt(0)?.toUpperCase() || 'Y';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: currentUser?.avatarUrl || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png' }}
              style={styles.avatarImage}
            />
            {!currentUser?.avatarUrl && (
              <Text style={styles.avatarInitial}>{profileInitial}</Text>
            )}
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerGreeting}>Selam,</Text>
            <Text style={styles.headerTitle}>{displayName}!</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setSortMenuVisible(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.filterButton}
        >
          <Feather name="sliders" size={18} color="#E5E5FF" />
          <Text style={styles.sortButtonText}>Filtrele</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBarWrap, { paddingHorizontal }]}>
        <View style={styles.searchBarInner}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Yayıncı ara (3+ karakter)..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={runSearch}
            autoCorrect={false}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={12} style={styles.searchClearBtn}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable onPress={runSearch} style={styles.searchSubmitBtn} disabled={searchQuery.trim().length < 3}>
            <Text style={[styles.searchSubmitText, searchQuery.trim().length < 3 && styles.searchSubmitTextDisabled]}>Ara</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryAndListWrap}>
        <ScrollView
          ref={listRef}
          style={[styles.scroll, loading && styles.scrollLoading]}
          contentContainerStyle={[styles.listContent, { paddingHorizontal }]}
          showsVerticalScrollIndicator={false}
        >
          {searchLoading && (
            <View style={styles.channelCardWrap}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <Pressable
              onPress={() => selectChannelForClips(searchResults[0])}
              style={({ pressed }) => [styles.channelCard, pressed && styles.channelCardPressed]}
            >
              <Image
                source={{ uri: searchResults[0].thumbnail_url || searchResults[0].profile_image_url }}
                style={styles.channelCardAvatar}
              />
              <View style={styles.channelCardBody}>
                <View style={styles.channelCardNameRow}>
                  <Text style={styles.channelCardName} numberOfLines={1}>
                    {searchResults[0].display_name || searchResults[0].broadcaster_login}
                  </Text>
                  {searchResults[0].is_live && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>CANLI</Text>
                    </View>
                  )}
                </View>
                {(searchResults[0].title || '').trim().length > 0 && (
                  <Text style={styles.channelCardStatus} numberOfLines={1}>
                    {searchResults[0].title}
                  </Text>
                )}
                {channelStats && (
                  <View style={styles.channelCardStats}>
                    <Text style={styles.channelCardStatText}>
                      {abbreviateNumber(channelStats.follower_count)} takipçi
                    </Text>
                    <Text style={styles.channelCardStatDot}>·</Text>
                    <Text style={styles.channelCardStatText}>
                      {abbreviateNumber(channelStats.view_count)} izlenme
                    </Text>
                  </View>
                )}
                <Text style={styles.channelCardHint}>Klipleri görmek için dokun</Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.textSecondary} />
            </Pressable>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryBarContent}
            style={styles.categoryBar}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => selectCategory(cat.id)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                >
                  <Text
                    style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}
                    includeFontPadding={false}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

        <View style={styles.grid}>
          {filteredClips.map((clip) => (
            <View key={clip.id} style={styles.cell}>
              <ClipGridCard item={clip} onPress={openClip} social={getClipSocial(clip.id)} />
            </View>
          ))}
        </View>
        <View style={{ height: 40 }}></View>
        </ScrollView>
      </View>

      {/* Filtrele Modal - Kademeli (Nested) Seçim */}
      <Modal
        visible={sortMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortMenuVisible(false)}>
          <View style={styles.modalPanel} onStartShouldSetResponder={() => true}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Filtrele</Text>

                {/* 1. Yıl Seçimi */}
                <Pressable
                  onPress={() => toggleSection('year')}
                  style={({ pressed }) => [styles.nestedMainRow, pressed && styles.nestedMainRowPressed]}
                >
                  <Feather name="calendar" size={20} color={colors.textPrimary} style={styles.nestedMainIcon} />
                  <Text style={styles.nestedMainText} numberOfLines={1}>
                    {selectedYear != null ? `Yıl: ${selectedYear}` : 'Yıl Seçimi'}
                  </Text>
                  <Feather
                    name={expandedSection === 'year' ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {expandedSection === 'year' && (
                  <View style={styles.nestedSubList}>
                    {YEARS.map((y) => {
                      const isSelected = selectedYear === y;
                      return (
                        <Pressable
                          key={y}
                          onPress={() => selectYear(y)}
                          style={({ pressed }) => [
                            styles.nestedSubRow,
                            isSelected && styles.nestedSubRowSelected,
                            pressed && styles.nestedSubRowPressed,
                          ]}
                        >
                          <Text style={[styles.nestedSubText, isSelected && styles.nestedSubTextSelected]}>{y}</Text>
                          {isSelected && <Feather name="check" size={18} color="#A970FF" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* 2. Ay Seçimi */}
                <Pressable
                  onPress={() => toggleSection('month')}
                  style={({ pressed }) => [styles.nestedMainRow, pressed && styles.nestedMainRowPressed]}
                >
                  <Feather name="calendar" size={20} color={colors.textPrimary} style={styles.nestedMainIcon} />
                  <Text style={styles.nestedMainText} numberOfLines={1}>
                    {selectedMonth != null ? `Ay: ${MONTHS[selectedMonth]}` : 'Ay Seçimi'}
                  </Text>
                  <Feather
                    name={expandedSection === 'month' ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {expandedSection === 'month' && (
                  <View style={styles.nestedSubList}>
                    {MONTHS.map((name, i) => {
                      const now = new Date();
                      const yearForMonth = now.getMonth() >= i ? now.getFullYear() : now.getFullYear() - 1;
                      const isSelected = selectedMonth === i && selectedYear === yearForMonth;
                      return (
                        <Pressable
                          key={name}
                          onPress={() => selectMonth(i)}
                          style={({ pressed }) => [
                            styles.nestedSubRow,
                            isSelected && styles.nestedSubRowSelected,
                            pressed && styles.nestedSubRowPressed,
                          ]}
                        >
                          <Text style={[styles.nestedSubText, isSelected && styles.nestedSubTextSelected]}>{name}</Text>
                          {isSelected && <Feather name="check" size={18} color="#A970FF" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* 3. Sıralama Ölçütü */}
                <Pressable
                  onPress={() => toggleSection('sort')}
                  style={({ pressed }) => [styles.nestedMainRow, pressed && styles.nestedMainRowPressed]}
                >
                  <Feather name="bar-chart-2" size={20} color={colors.textPrimary} style={styles.nestedMainIcon} />
                  <Text style={styles.nestedMainText} numberOfLines={1}>
                    {sortOption ? `Sıralama: ${sortOptionLabel}` : 'Sıralama Ölçütü'}
                  </Text>
                  <Feather
                    name={expandedSection === 'sort' ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {expandedSection === 'sort' && (
                  <View style={styles.nestedSubList}>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortOption === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => selectSortOption(opt.id)}
                          style={({ pressed }) => [
                            styles.nestedSubRow,
                            isSelected && styles.nestedSubRowSelected,
                            pressed && styles.nestedSubRowPressed,
                          ]}
                        >
                          <Text style={[styles.nestedSubText, isSelected && styles.nestedSubTextSelected]}>{opt.label}</Text>
                          {isSelected && <Feather name="check" size={18} color="#A970FF" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalCancelWrap}>
              <Pressable
                onPress={() => setSortMenuVisible(false)}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.modalCancelBtnPressed]}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    marginTop: 0,
  },
  scrollLoading: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B1B2A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarInitial: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E5FF',
  },
  headerTextWrap: {
    flexDirection: 'column',
  },
  headerGreeting: {
    fontSize: 12,
    color: 'rgba(229,229,255,0.7)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.textPrimary,
    flex: 1,
  },
  sortButtonText: {
    color: '#E5E5FF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(127,86,217,0.16)',
    gap: 6,
  },
  searchBarWrap: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchSubmitBtn: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#A970FF',
    justifyContent: 'center',
  },
  searchSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchSubmitTextDisabled: {
    opacity: 0.5,
  },
  channelCardWrap: {
    marginBottom: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(169, 112, 255, 0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(169, 112, 255, 0.25)',
  },
  channelCardPressed: {
    opacity: 0.9,
  },
  channelCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
  },
  channelCardBody: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    minWidth: 0,
  },
  channelCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  channelCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: '#E91916',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  channelCardStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  channelCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelCardStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  channelCardStatDot: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  channelCardHint: {
    fontSize: 11,
    color: '#A970FF',
    marginTop: 4,
  },
  categoryAndListWrap: {
    flex: 1,
    justifyContent: 'flex-start', // içeriği yukarı yapıştır
  },
  categoryBar: {
    marginTop: 0,      // Header'a sıfır
    marginBottom: 4,   // Liste ile arasında hafif boşluk
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 2, // Yazılar kutuya çarpmasın diye çok az dikey boşluk
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipSelected: {
    backgroundColor: '#A970FF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlignVertical: 'center',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 12,    // kategori ile klipler arasında hafif boşluk
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: '48%',
    marginBottom: GRID_GAP,
  },
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  repostBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  card: {
    width: '100%',
    backgroundColor: '#141428',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#7F56D9',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardPressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  viewTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,15,30,0.82)',
  },
  viewTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E5FF',
  },
  thumbGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    paddingHorizontal: 8,
    paddingBottom: 6,
    justifyContent: 'flex-end',
  },
  thumbTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  thumbBroadcaster: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  thumbPlaceholder: {
    backgroundColor: colors.border,
  },
  cardInfo: {
    padding: 8,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaIcon: {
    marginRight: 4,
  },
  broadcaster: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  viewCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalContent: {
    flexDirection: 'column',
  },
  nestedMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  nestedMainRowPressed: {
    opacity: 0.85,
  },
  nestedMainIcon: {
    marginRight: 12,
  },
  nestedMainText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  nestedSubList: {
    paddingLeft: 20,
    paddingBottom: 8,
  },
  nestedSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  nestedSubRowSelected: {
    backgroundColor: 'rgba(169, 112, 255, 0.2)',
  },
  nestedSubRowPressed: {
    opacity: 0.85,
  },
  nestedSubText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  nestedSubTextSelected: {
    color: '#A970FF',
    fontWeight: '700',
  },
  modalCancelWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  modalCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  modalCancelBtnPressed: {
    opacity: 0.9,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
};

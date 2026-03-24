import React, { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/theme';
import { useClips } from '../../context/ClipsContext';
import { abbreviateNumber } from '../../utils/format';

const thumbnailUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\{width\}x\{height\}/, '480x270');
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { currentUser, myQuotes } = useClips();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [compactModeEnabled, setCompactModeEnabled] = useState(false);

  const profileAvatar = useMemo(
    () => currentUser?.avatarUrl || thumbnailUrl(myQuotes?.[0]?.thumbnail_url),
    [currentUser?.avatarUrl, myQuotes]
  );

  const quoteCount = myQuotes?.length || 0;
  const totalViews = useMemo(
    () => (myQuotes || []).reduce((sum, clip) => sum + (Number(clip?.view_count) || 0), 0),
    [myQuotes]
  );

  const openClip = (clip) => {
    if (!clip?.id) return;
    navigation.navigate('Home', { screen: 'ClipDetail', params: { clip } });
  };

  const goToExplore = () => navigation.navigate('Home');

  const settingsItems = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: 'Bildirimler',
      subtitle: 'Yeni klip ve alıntı bildirimleri',
      value: notificationsEnabled,
      onValueChange: setNotificationsEnabled,
    },
    {
      id: 'autoplay',
      icon: 'play-circle-outline',
      title: 'Klip Otomatik Oynat',
      subtitle: 'Akışta klipler otomatik başlasın',
      value: autoPlayEnabled,
      onValueChange: setAutoPlayEnabled,
    },
    {
      id: 'compact',
      icon: 'phone-portrait-outline',
      title: 'Kompakt Görünüm',
      subtitle: 'Daha sıkı kart yerleşimi kullan',
      value: compactModeEnabled,
      onValueChange: setCompactModeEnabled,
    },
  ];

  const ListHeaderComponent = (
    <View style={styles.headerWrap}>
      <View style={styles.profileTopRow}>
        <Text style={styles.screenTitle}>Profil</Text>
        <View style={styles.headerRightSpacer} />
      </View>
      <View style={styles.card}>
        <View style={styles.userRow}>
          {profileAvatar ? (
            <Image source={{ uri: profileAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, styles.avatarPlaceholderWrap]}>
              <Ionicons name="person-circle-outline" size={46} color="#B9BAC7" />
            </View>
          )}
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{currentUser?.name || 'Kullanıcı'}</Text>
            <Text style={styles.subtitle}>Sadece alıntılanmış klipler</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{abbreviateNumber(quoteCount)}</Text>
            <Text style={styles.statLabel}>Alıntı</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{abbreviateNumber(totalViews)}</Text>
            <Text style={styles.statLabel}>Toplam İzlenme</Text>
          </View>
        </View>
      </View>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
        <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
      </View>
      <View style={styles.settingsCard}>
        {settingsItems.map((item, index) => (
          <View
            key={item.id}
            style={[styles.settingRow, index === settingsItems.length - 1 && styles.settingRowLast]}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name={item.icon} size={17} color="#C9B2FF" />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#474754', true: '#A970FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="chatbox-ellipses-outline" size={17} color="#FFFFFF" />
        <Text style={styles.sectionTitle}>Alıntılanmış Klipler</Text>
      </View>
    </View>
  );

  const ListEmptyComponent = (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.accent} />
      <Text style={styles.emptyTitle}>Henüz alıntı eklenmedi</Text>
      <Text style={styles.emptyText}>Bir klibe alıntı eklediğinde burada görünecek.</Text>
      <Pressable
        style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.86 }]}
        onPress={goToExplore}
      >
        <Text style={styles.emptyBtnText}>Kliplere git</Text>
      </Pressable>
    </View>
  );

  const renderQuote = ({ item }) => {
    const thumb = thumbnailUrl(item.thumbnail_url);
    return (
      <Pressable
        style={({ pressed }) => [styles.quoteCard, pressed && styles.quoteCardPressed]}
        onPress={() => openClip(item)}
      >
        <View style={styles.quoteThumbWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.quoteThumb} />
          ) : (
            <View style={[styles.quoteThumb, styles.avatarFallback]} />
          )}
        </View>
        <View style={styles.quoteBody}>
          <Text style={styles.quoteText} numberOfLines={2}>
            {item?.text || 'Alıntı metni yok'}
          </Text>
          <Text style={styles.quoteClipTitle} numberOfLines={1}>
            {item?.title || 'Klip'}
          </Text>
          <Text style={styles.quoteMeta} numberOfLines={1}>
            {item?.broadcaster_name || 'Yayıncı'} · {abbreviateNumber(item?.view_count || 0)} izlenme
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={myQuotes || []}
        keyExtractor={(item, idx) => `${item?.id || 'quote'}-${idx}`}
        renderItem={renderQuote}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1E' },
  listContent: { paddingBottom: 28 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 14 },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  screenTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  headerRightSpacer: { width: 42, height: 42 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
  },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 12 },
  avatarFallback: { backgroundColor: '#23242C' },
  avatarPlaceholderWrap: { alignItems: 'center', justifyContent: 'center' },
  nameWrap: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(169,112,255,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statNumber: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  settingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(169,112,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#A970FF',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteCardPressed: { opacity: 0.9 },
  quoteThumbWrap: {
    width: 92,
    height: 54,
    borderRadius: 10,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  quoteThumb: { width: '100%', height: '100%' },
  quoteBody: { flex: 1 },
  quoteText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  quoteClipTitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 2 },
  quoteMeta: { color: 'rgba(255,255,255,0.62)', fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 26, paddingVertical: 56 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 18 },
  emptyBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});

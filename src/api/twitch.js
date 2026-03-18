import axios from 'axios';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_URL = 'https://api.twitch.tv/helix';

/** Kategori → Twitch game_id eşlemesi */
export const CATEGORY_GAME_IDS = {
  just_chatting: '509658',   // Just Chatting
  gaming: '32982',           // GTA V
  music: '26936',            // Music
  esport: '21779',           // League of Legends
};

/** Dün Gece sayfası için game_id → kategori etiketi (Hepsi, Drama, Oyun, Fail) */
export const GAME_ID_TO_CATEGORY = {
  [CATEGORY_GAME_IDS.just_chatting]: 'Drama',
  [CATEGORY_GAME_IDS.gaming]: 'Oyun',
  [CATEGORY_GAME_IDS.music]: 'Oyun',
  [CATEGORY_GAME_IDS.esport]: 'Oyun',
};

const CLIENT_ID = '65buha7i8z8g0lo6wyg3i1ebuh8ekq';
const CLIENT_SECRET = '21gcse8nhg8lpcbva2vtmp6199bxot';

const toRFC3339 = (date) => date.toISOString();

const defaultHeaders = (accessToken) => ({
  'Client-ID': CLIENT_ID,
  Authorization: `Bearer ${accessToken}`,
});

/**
 * Twitch OAuth2 token endpoint'ine POST atar, access_token döner.
 * @returns {Promise<string>}
 */
export const getAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  }).toString();
  const { data } = await axios.post(TWITCH_TOKEN_URL, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data.access_token;
};

/**
 * Belirtilen kategori (game_id) için en popüler 20 klibi çeker.
 * @param {string} accessToken
 * @param {string|null} gameId - null ise 'Tümü': birden fazla kategoriden çekip birleştirir
 * @returns {Promise<Array>}
 */
export const fetchTopClips = async (accessToken, gameId = CATEGORY_GAME_IDS.just_chatting) => {
  if (gameId) {
    const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
      params: { game_id: gameId, first: 20 },
      headers: defaultHeaders(accessToken),
    });
    return data.data || [];
  }
  // Tümü: her kategoriden 5 klip çek, birleştir, izlenmeye göre sırala, ilk 20
  const ids = Object.values(CATEGORY_GAME_IDS);
  const results = await Promise.all(
    ids.map((id) =>
      axios.get(`${TWITCH_HELIX_URL}/clips`, {
        params: { game_id: id, first: 5 },
        headers: defaultHeaders(accessToken),
      })
    )
  );
  const combined = results.flatMap((r) => r.data.data || []);
  const unique = Array.from(new Map(combined.map((c) => [c.id, c])).values());
  return unique.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)).slice(0, 20);
};

/**
 * type'a göre klipleri API'den çeker. gameId null ise mevcut kategorilerden birini kullanmaz; sadece tek game_id ile çağrıldığında kullan.
 * @param {string} accessToken
 * @param {'popular'|'new'|'old'} type
 * @param {string|null} gameId
 * @returns {Promise<Array>}
 */
export const fetchClips = async (accessToken, type, gameId = CATEGORY_GAME_IDS.just_chatting) => {
  if (!gameId) return []; // Tümü için tarih filtreleri ayrı handle edilebilir; şimdilik boş
  const now = new Date();
  const headers = defaultHeaders(accessToken);
  const base = { game_id: gameId, first: 20 };

  if (type === 'popular') {
    const started_at = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ended_at = now;
    const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
      params: { ...base, started_at: toRFC3339(started_at), ended_at: toRFC3339(ended_at) },
      headers,
    });
    return data.data || [];
  }

  if (type === 'new') {
    const started_at = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ended_at = now;
    const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
      params: { ...base, started_at: toRFC3339(started_at), ended_at: toRFC3339(ended_at) },
      headers,
    });
    const list = data.data || [];
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (type === 'old') {
    const ended_at = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const started_at = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
      params: { ...base, started_at: toRFC3339(started_at), ended_at: toRFC3339(ended_at) },
      headers,
    });
    return data.data || [];
  }

  return [];
};

/**
 * Belirli tarih aralığındaki klipleri çeker (yıl/ay filtreleri için).
 * @param {string} accessToken
 * @param {Date} started_at
 * @param {Date} ended_at
 * @param {string|null} gameId
 * @returns {Promise<Array>}
 */
export const fetchClipsByPeriod = async (accessToken, started_at, ended_at, gameId = CATEGORY_GAME_IDS.just_chatting) => {
  if (!gameId) return [];
  const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
    params: {
      game_id: gameId,
      first: 20,
      started_at: toRFC3339(started_at),
      ended_at: toRFC3339(ended_at),
    },
    headers: defaultHeaders(accessToken),
  });
  return data.data || [];
};

/**
 * Twitch'te kanal arar. GET /helix/search/channels?query=...
 * @param {string} accessToken
 * @param {string} query - Arama metni
 * @returns {Promise<Array>} Kanal listesi (id, display_name, thumbnail_url, is_live, title, ...)
 */
export const searchChannels = async (accessToken, query) => {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];
  const { data } = await axios.get(`${TWITCH_HELIX_URL}/search/channels`, {
    params: { query: trimmed, first: 10 },
    headers: defaultHeaders(accessToken),
  });
  return data.data || [];
};

/**
 * Yayıncı için izlenme ve takipçi sayısını döndürür.
 * @param {string} accessToken
 * @param {string} broadcasterId
 * @returns {Promise<{ view_count: number, follower_count: number }>}
 */
export const getChannelStats = async (accessToken, broadcasterId) => {
  if (!broadcasterId) return { view_count: 0, follower_count: 0 };
  const headers = defaultHeaders(accessToken);
  const [userRes, followersRes] = await Promise.all([
    axios.get(`${TWITCH_HELIX_URL}/users`, { params: { id: broadcasterId }, headers }),
    axios.get(`${TWITCH_HELIX_URL}/channels/followers`, {
      params: { broadcaster_id: broadcasterId, first: 1 },
      headers,
    }),
  ]);
  const view_count = userRes.data?.data?.[0]?.view_count ?? 0;
  const follower_count = followersRes.data?.total ?? 0;
  return { view_count, follower_count };
};

/**
 * Belirtilen yayıncının kliplerini çeker. GET /helix/clips?broadcaster_id=...
 * @param {string} accessToken
 * @param {string} broadcasterId
 * @returns {Promise<Array>}
 */
export const fetchClipsByBroadcaster = async (accessToken, broadcasterId) => {
  if (!broadcasterId) return [];
  const { data } = await axios.get(`${TWITCH_HELIX_URL}/clips`, {
    params: { broadcaster_id: broadcasterId, first: 20 },
    headers: defaultHeaders(accessToken),
  });
  return data.data || [];
};

/**
 * Tam zamanlı videoları (VOD / archive) çeker. GET /helix/videos
 * type=archive → sadece yayından kaydedilen tam VOD'lar.
 * @param {string} accessToken
 * @param {Object} options
 * @param {string} [options.gameId] - Oyun ID. Verilmezse tüm kategorilerden çekilir ve category atanır.
 * @param {number} [options.first=30]
 * @param {string} [options.period='week'] - 'all' | 'day' | 'week' | 'month'
 * @param {string} [options.sort='views'] - 'time' | 'trending' | 'views'
 * @param {string} [options.type='archive'] - 'all' | 'archive' | 'highlight' | 'upload'
 * @returns {Promise<Array>} Klip benzeri nesneler: id, title, thumbnail_url, broadcaster_name, created_at, view_count, category, url (VOD link)
 */
export const fetchVideos = async (accessToken, options = {}) => {
  const { gameId, first = 30, period = 'week', sort = 'views', type = 'archive' } = options;
  const headers = defaultHeaders(accessToken);

  const mapVideo = (v, category = 'Oyun') => ({
    id: v.id,
    title: v.title || 'VOD',
    thumbnail_url: v.thumbnail_url || '',
    embed_url: v.id ? `https://player.twitch.tv/?video=${v.id}` : '',
    url: v.url,
    broadcaster_name: v.user_name || v.user_login || 'Yayıncı',
    created_at: v.created_at || v.published_at,
    view_count: v.view_count ?? 0,
    duration: v.duration,
    category,
  });

  if (gameId) {
    const { data } = await axios.get(`${TWITCH_HELIX_URL}/videos`, {
      params: { game_id: gameId, first, period, sort, type },
      headers,
    });
    const category = GAME_ID_TO_CATEGORY[gameId] || 'Oyun';
    return (data.data || []).map((v) => mapVideo(v, category));
  }

  const entries = Object.entries(CATEGORY_GAME_IDS);
  const perGame = Math.max(6, Math.ceil(first / entries.length));
  const results = await Promise.all(
    entries.map(([key, id]) =>
      axios.get(`${TWITCH_HELIX_URL}/videos`, {
        params: { game_id: id, first: perGame, period, sort, type },
        headers,
      }).then((res) => {
        const category = GAME_ID_TO_CATEGORY[id] || 'Oyun';
        return (res.data.data || []).map((v) => mapVideo(v, category));
      })
    )
  );
  const combined = results.flat();
  const unique = Array.from(new Map(combined.map((v) => [v.id, v])).values());
  return unique.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)).slice(0, first);
};

/**
 * Özet (Dün Gece) sayfası için gerçek Twitch klipleri.
 * VOD yerine /helix/clips — oyun kategorilerine göre son 7 gün, birleştirilip izlenmeye göre sıralanır.
 * @param {string} accessToken
 * @param {{ first?: number }} [options]
 * @returns {Promise<Array>}
 */
export const fetchSummaryClips = async (accessToken, options = {}) => {
  const { first = 40 } = options;
  const headers = defaultHeaders(accessToken);
  const ended_at = new Date();
  const started_at = new Date(ended_at.getTime() - 7 * 24 * 60 * 60 * 1000);

  const entries = Object.entries(CATEGORY_GAME_IDS);
  const perGame = Math.max(8, Math.ceil(first / entries.length));

  const results = await Promise.all(
    entries.map(([, gameId]) =>
      axios
        .get(`${TWITCH_HELIX_URL}/clips`, {
          params: {
            game_id: gameId,
            first: Math.min(100, perGame + 4),
            started_at: toRFC3339(started_at),
            ended_at: toRFC3339(ended_at),
          },
          headers,
        })
        .then((res) => {
          const category = GAME_ID_TO_CATEGORY[gameId] || 'Oyun';
          return (res.data.data || []).map((c) => ({
            id: c.id,
            title: c.title || 'Klip',
            thumbnail_url: c.thumbnail_url || '',
            embed_url: c.embed_url || (c.id ? `https://clips.twitch.tv/${c.id}` : ''),
            url: c.url,
            broadcaster_name: c.broadcaster_name || 'Yayıncı',
            created_at: c.created_at,
            view_count: c.view_count ?? 0,
            duration:
              typeof c.duration === 'number' && Number.isFinite(c.duration)
                ? `${Math.round(c.duration)}s`
                : c.duration || '',
            category,
          }));
        })
    )
  );

  const combined = results.flat();
  const unique = Array.from(new Map(combined.map((c) => [c.id, c])).values());
  return unique.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)).slice(0, first);
};

export default {
  getAccessToken,
  fetchTopClips,
  fetchClips,
  fetchClipsByPeriod,
  searchChannels,
  getChannelStats,
  fetchClipsByBroadcaster,
  fetchVideos,
  fetchSummaryClips,
};

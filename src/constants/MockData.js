/**
 * Dün Gece Ne Oldu sayfası için örnek klip verisi.
 * İleride fetch veya Firebase ile değiştirilebilir (Loose Coupling).
 * Her klip: id, title, thumbnail_url, embed_url, broadcaster_name, created_at, view_count, category
 */
export const CATEGORIES = [
  { id: 'Hepsi', label: 'Hepsi' },
  { id: 'Drama', label: 'Drama' },
  { id: 'Oyun', label: 'Oyun' },
  { id: 'Fail', label: 'Fail' },
];

export const CLIPS = [
  {
    id: 'mock-1',
    title: 'Son saniye clutch ile kazandık',
    thumbnail_url: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-188x250.jpg',
    embed_url: '',
    broadcaster_name: 'StreamerCan',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    view_count: 12500,
    category: 'Oyun',
  },
  {
    id: 'mock-2',
    title: 'Sohbet kızıştı, herkes konuşuyor',
    thumbnail_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509658-188x250.jpg',
    embed_url: '',
    broadcaster_name: 'DramaQueen',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    view_count: 8200,
    category: 'Drama',
  },
  {
    id: 'mock-3',
    title: 'Ranked fail compilation',
    thumbnail_url: 'https://static-cdn.jtvnw.net/ttv-boxart/21779-188x250.jpg',
    embed_url: '',
    broadcaster_name: 'FailKing',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    view_count: 45100,
    category: 'Fail',
  },
  {
    id: 'mock-4',
    title: 'Gece yarısı Valorant serisi',
    thumbnail_url: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-188x250.jpg',
    embed_url: '',
    broadcaster_name: 'StreamerCan',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    view_count: 3100,
    category: 'Oyun',
  },
  {
    id: 'mock-5',
    title: 'Tartışma anı - chat patladı',
    thumbnail_url: 'https://static-cdn.jtvnw.net/ttv-boxart/509658-188x250.jpg',
    embed_url: '',
    broadcaster_name: 'DramaQueen',
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    view_count: 18900,
    category: 'Drama',
  },
];

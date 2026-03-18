import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'streamhub_social';
const CURRENT_USER = { id: 'me', name: 'Kullanıcı' };

const DEFAULT_COLLECTIONS = [
  { id: 'all', name: 'Tümü' },
  { id: 'clutch', name: 'Efsane Clutchlar' },
  { id: 'funny', name: 'Komik Anlar' },
  { id: 'valorant', name: 'Valorant Highlights' },
];

const defaultSocial = () => ({
  clips: {},
  myReposts: [],
  myQuotes: [],
  myOwnClips: [],
  collections: DEFAULT_COLLECTIONS,
});

const ClipsContext = createContext(null);

export function ClipsProvider({ children }) {
  const [social, setSocial] = useState(defaultSocial());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSocial({
            clips: parsed.clips || {},
            myReposts: Array.isArray(parsed.myReposts) ? parsed.myReposts : [],
            myQuotes: Array.isArray(parsed.myQuotes) ? parsed.myQuotes : [],
            myOwnClips: Array.isArray(parsed.myOwnClips) ? parsed.myOwnClips : [],
            collections:
              Array.isArray(parsed.collections) && parsed.collections.length > 0
                ? parsed.collections
                : DEFAULT_COLLECTIONS,
          });
        }
      } catch (_) {}
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setSocial(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  }, []);

  const getClipSocial = useCallback(
    (clipId) => {
      const c = social.clips[clipId] || {};
      return {
        likeCount: Number(c.likeCount) || 0,
        liked: Boolean(c.liked),
        repostedBy: Array.isArray(c.repostedBy) ? c.repostedBy : [],
        quotes: Array.isArray(c.quotes) ? c.quotes : [],
      };
    },
    [social.clips]
  );

  const toggleLike = useCallback(
    (clipId) => {
      if (!clipId) return;
      const clip = social.clips[clipId] || { likeCount: 0, liked: false, repostedBy: [], quotes: [] };
      const liked = !clip.liked;
      const likeCount = Math.max(0, (clip.likeCount || 0) + (liked ? 1 : -1));
      const next = {
        ...social,
        clips: {
          ...social.clips,
          [clipId]: { ...clip, likeCount, liked },
        },
      };
      persist(next);
    },
    [social, persist]
  );

  const repostClip = useCallback(
    (clip) => {
      if (!clip?.id) return;
      const clipSnapshot = {
        id: clip.id,
        title: clip.title,
        thumbnail_url: clip.thumbnail_url,
        embed_url: clip.embed_url,
        broadcaster_name: clip.broadcaster_name,
        created_at: clip.created_at,
        view_count: clip.view_count,
      };
      const clipData = social.clips[clip.id] || { likeCount: 0, liked: false, repostedBy: [], quotes: [] };
      const repostedBy = clipData.repostedBy || [];
      if (repostedBy.includes(CURRENT_USER.name)) return;
      const next = {
        ...social,
        clips: {
          ...social.clips,
          [clip.id]: { ...clipData, repostedBy: [...repostedBy, CURRENT_USER.name] },
        },
        myReposts: [...social.myReposts, clipSnapshot],
      };
      persist(next);
    },
    [social, persist]
  );

  const quoteClip = useCallback(
    (clip, text) => {
      if (!clip?.id || !text?.trim()) return;
      const clipSnapshot = {
        id: clip.id,
        title: clip.title,
        thumbnail_url: clip.thumbnail_url,
        embed_url: clip.embed_url,
        broadcaster_name: clip.broadcaster_name,
        created_at: clip.created_at,
        view_count: clip.view_count,
      };
      const quoteEntry = { id: Date.now().toString(), authorName: CURRENT_USER.name, text: text.trim(), date: new Date().toISOString() };
      const clipData = social.clips[clip.id] || { likeCount: 0, liked: false, repostedBy: [], quotes: [] };
      const next = {
        ...social,
        clips: {
          ...social.clips,
          [clip.id]: { ...clipData, quotes: [...(clipData.quotes || []), quoteEntry] },
        },
        myQuotes: [...social.myQuotes, { ...clipSnapshot, text: text.trim(), date: quoteEntry.date }],
      };
      persist(next);
    },
    [social, persist]
  );

  const addCollection = useCallback(
    (name) => {
      const label = name && name.trim().length > 0 ? name.trim() : `Koleksiyon ${Date.now()}`;
      const existing = Array.isArray(social.collections) ? social.collections : DEFAULT_COLLECTIONS;
      const next = {
        ...social,
        collections: [
          ...existing,
          { id: Date.now().toString(), name: label },
        ],
      };
      persist(next);
    },
    [social, persist]
  );

  const renameCollection = useCallback(
    (id, name) => {
      if (!id) return;
      const label = name && name.trim().length > 0 ? name.trim() : 'Koleksiyon';
      const existing = Array.isArray(social.collections) ? social.collections : DEFAULT_COLLECTIONS;
      const next = {
        ...social,
        collections: existing.map((c) => (c.id === id ? { ...c, name: label } : c)),
      };
      persist(next);
    },
    [social, persist]
  );

  const deleteCollection = useCallback(
    (id) => {
      if (!id || id === 'all') return;
      const existing = Array.isArray(social.collections) ? social.collections : DEFAULT_COLLECTIONS;
      const next = {
        ...social,
        collections: existing.filter((c) => c.id !== id),
      };
      persist(next);
    },
    [social, persist]
  );

  const value = {
    ready,
    currentUser: CURRENT_USER,
    getClipSocial,
    toggleLike,
    repostClip,
    quoteClip,
    myReposts: social.myReposts,
    myQuotes: social.myQuotes,
    myOwnClips: social.myOwnClips,
    collections: Array.isArray(social.collections) ? social.collections : DEFAULT_COLLECTIONS,
    addCollection,
    renameCollection,
    deleteCollection,
  };

  return <ClipsContext.Provider value={value}>{children}</ClipsContext.Provider>;
}

export function useClips() {
  const ctx = useContext(ClipsContext);
  if (!ctx) throw new Error('useClips must be used within ClipsProvider');
  return ctx;
}

export default ClipsContext;

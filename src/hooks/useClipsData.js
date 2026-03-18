import { useState, useCallback, useEffect } from 'react';
import { getAccessToken, fetchSummaryClips } from '../api/twitch';
import { CATEGORIES } from '../constants/MockData';

/**
 * Dün Gece Ne Oldu sayfası için veri hook'u.
 * Twitch API'den özet için gerçek klipleri (/clips) çeker; kullanıcı eklediği klipler state'e eklenir.
 * @returns {{ clips: Array, addClip: (clip: object) => void, categories: Array, loading: boolean, error: string|null, refetch: () => void }}
 */
export function useClipsData() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const list = await fetchSummaryClips(token, { first: 40 });
      setClips(list);
    } catch (e) {
      setError(e?.message || 'Videolar yüklenemedi.');
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const addClip = useCallback((clip) => {
    const newClip = {
      id: clip?.id || `local-${Date.now()}`,
      title: clip?.title ?? 'Yeni klip',
      thumbnail_url: clip?.thumbnail_url ?? '',
      embed_url: clip?.embed_url ?? '',
      url: clip?.url,
      broadcaster_name: clip?.broadcaster_name ?? 'Yayıncı',
      created_at: clip?.created_at ?? new Date().toISOString(),
      view_count: clip?.view_count ?? 0,
      category: clip?.category ?? 'Oyun',
      tags: Array.isArray(clip?.tags) ? clip.tags : [],
    };
    setClips((prev) => [newClip, ...prev]);
  }, []);

  return {
    clips,
    addClip,
    categories: CATEGORIES,
    loading,
    error,
    refetch: loadVideos,
  };
}

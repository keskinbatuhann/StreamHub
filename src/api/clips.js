// Twitch Developer Console'dan alınan Client ID (auth.js ile aynı)
const CLIENT_ID = process.env.EXPO_PUBLIC_TWITCH_CLIENT_ID || 'SENIN_CLIENT_ID';

// Helix Clips API: Belirli bir oyun/kategoriye göre en popüler klipleri çeker.
// game_id=509658 → Just Chatting
const fetchTopClips = async (accessToken) => {
  const response = await fetch(
    'https://api.twitch.tv/helix/clips?game_id=509658&first=10',
    {
      headers: {
        'Client-ID': CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const clips = await response.json();
  return clips.data; // Kliplerin URL'si, thumbnail'ı, yayıncı adı vb. gelir.
};

export default fetchTopClips;

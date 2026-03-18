// Twitch Developer Console'dan Client ID ve Client Secret alıp aşağıya yazın.
const CLIENT_ID = process.env.EXPO_PUBLIC_TWITCH_CLIENT_ID || 'SENIN_CLIENT_ID';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_TWITCH_CLIENT_SECRET || 'SENIN_SECRET';

// Bu bir örnek istektir, arka planda bir kez çalışır.
// Client ID ve Secret'ını kullanarak Twitch'ten geçici bir anahtar alırız.
const getTwitchToken = async () => {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const data = await response.json();
  return data.access_token; // Bu token ile klip çekebiliriz.
};

export default getTwitchToken;

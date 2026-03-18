# StreamHub

Web ve mobil (iOS / Android) için tek kod tabanıyla çalışan React (Expo) uygulaması.

## Gereksinimler

- Node.js 18+
- npm veya yarn

## Kurulum

```bash
npm install
```

## Çalıştırma

| Platform | Komut |
|----------|--------|
| **Web** | `npm run web` |
| **Android** | `npm run android` (emülatör veya cihaz + Expo Go) |
| **iOS** | `npm run ios` (sadece macOS; Windows’ta Expo Go ile test edebilirsiniz) |
| **Geliştirme sunucusu** | `npm run start` (platform seçimi için QR kod menüsü açılır) |

## Proje yapısı

- `App.js` – Ana uygulama bileşeni
- `app.json` – Expo (web / iOS / Android) yapılandırması
- `assets/` – İkonlar ve görseller
- `src/constants/theme.js` – Tasarım renkleri (Tailwind ile senkron)
- `tailwind.config.js` – Aynı renkler `className` ile kullanım için

Aynı React/React Native kodu web tarayıcıda, Android’de ve iOS’ta çalışır.

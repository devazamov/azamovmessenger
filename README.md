# AZAMOV — Telegram klon (Messenjer)

Real vaqtli, to'liq funksiyali chat ilovasi. **React + Firebase** asosida.
Server yo'q — Firebase butun backend'ni ta'minlaydi, shuning uchun
to'g'ridan-to'g'ri Netlify'ga joylashadi.

## Imkoniyatlar

### Asosiy
- ✅ Email/parol bilan ro'yxatdan o'tish va kirish (Firebase Auth)
- ✅ Shaxsiy suhbatlar (1:1), **guruhlar** va **kanallar** (broadcast)
- ✅ **Saqlangan xabarlar** (o'zi bilan suhbat)
- ✅ Real vaqtli xabar (Firestore onSnapshot)
- ✅ Rasm va fayl yuborish (Firebase Storage) + **to'liq ekran rasm ko'ruvchi**
- ✅ Onlayn holati va "yozmoqda..." indikatori

### Xabarlar
- ✅ **Ovozli xabarlar** (yozish + to'lqin shakli bilan ijro)
- ✅ **So'rovnomalar** (bitta/ko'p tanlovli, anonim, natijalar)
- ✅ **Stikerlar** va katta emoji (emoji-only xabar kattaroq ko'rinadi)
- ✅ Javob berish (reply), forward, tahrirlash, reaksiyalar
- ✅ **Hammaga / men uchun o'chirish**
- ✅ **Qadalgan xabar** (pin) + bannerga o'tish
- ✅ **Ko'p tanlash** (select mode): nusxalash, forward, o'chirish
- ✅ **Chat ichida qidiruv** (natijalar bo'yicha navigatsiya)
- ✅ **@mention** (avtotanlash) va havola (link) aniqlash
- ✅ Yetkazib berish/o'qildi belgilari (✓ / ✓✓)
- ✅ **O'z-o'zini yo'q qiluvchi xabarlar** (TTL: 10s / 1daq / 1soat)
- ✅ Kun ajratuvchilari (Bugun / Kecha / sana)

### Suhbatlar
- ✅ **Folderlar**: Hammasi / O'qilmagan / Shaxsiy / Guruhlar / Kanallar
- ✅ **Arxivlash**, **ovozsiz qilish (mute)**
- ✅ O'qilmagan xabarlar hisoblagichi
- ✅ Guruh/kanal boshqaruvi: nom/rasm/tavsifni tahrirlash, a'zo qo'shish/chiqarish, admin tayinlash, chiqish

### Stories
- ✅ 24 soatlik **Stories** (rasm) + ko'ruvchi (avtomatik o'tish, progress)
- ✅ Kim ko'rgani, o'chirish

### Qo'ng'iroqlar
- ✅ **Audio va video qo'ng'iroqlar** (WebRTC, Firestore signaling)
- ✅ Kelayotgan qo'ng'iroq, qabul/rad, mikrofon/kamerani o'chirish

### Profil va sozlamalar
- ✅ Profil: ism, bio, rasm, **emoji status** (premium)
- ✅ **Tungi/yorug' mavzu**, **accent rang**, **chat foni (wallpaper)**
- ✅ **Premium** (demo)
- ✅ **Bloklash / blokdan chiqarish**
- ✅ **Bildirishnomalar** (brauzer) + ovozli signal + sarlavhada o'qilmagan soni
- ✅ Foydalanuvchi profilini ko'rish

## Texnologiyalar

| Qatlam      | Texnologiya |
|-------------|-------------|
| Frontend    | React 18, Vite |
| Auth        | Firebase Authentication |
| Ma'lumotlar | Cloud Firestore (realtime) |
| Fayllar     | Firebase Storage |
| Qo'ng'iroq  | WebRTC (STUN) + Firestore signaling |
| Hosting     | Netlify |

## Firebase sozlash (bir martalik)

1. [console.firebase.google.com](https://console.firebase.google.com) da loyiha yarating.
2. **Authentication → Sign-in method → Email/Password** ni yoqing.
3. **Firestore Database** yarating (production mode).
4. **Storage** ni yoqing.
5. **Project settings → Web app** dan config'ni oling.
6. Xavfsizlik qoidalarini joylang:
   - Firestore → Rules → `firestore.rules` mazmunini qo'ying → Publish
   - Storage → Rules → `storage.rules` mazmunini qo'ying → Publish

## Lokal ishga tushirish

```bash
cd client
npm install
cp .env.example .env      # .env ni Firebase config bilan to'ldiring
npm run dev               # http://localhost:5173
```

`.env` quyidagicha to'ldiriladi:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=azamov-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=azamov-xxxx
VITE_FIREBASE_STORAGE_BUCKET=azamov-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

## Netlify'ga joylash

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → GitHub repo.
2. Sozlamalar:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
3. **Environment variables** ga `.env` dagi barcha `VITE_FIREBASE_*` qiymatlarni qo'shing.
4. **Deploy**.

> Firebase Console → Authentication → Settings → **Authorized domains** ga
> Netlify manzilingizni (`xxxx.netlify.app`) qo'shishni unutmang.

## Loyiha tuzilmasi

```
client/src/
├── firebase.js     # Firebase init (env config)
├── chatStore.js    # Auth + Firestore + Storage mantiqi (data layer)
├── calls.js        # WebRTC audio/video qo'ng'iroq
├── theme.js        # Mavzu, accent, wallpaper
├── notify.js       # Bildirishnoma, ovoz, sarlavha
├── App.jsx         # Asosiy holat, realtime listenerlar, orkestratsiya
├── Auth.jsx        # Kirish / ro'yxatdan o'tish
├── Sidebar.jsx     # Chat ro'yxati, folderlar, stories, arxiv
├── ChatView.jsx    # Chat oynasi (xabarlar, composer, qidiruv, select)
├── Settings.jsx    # Profil + mavzu + maxfiylik sozlamalari
├── UserProfile.jsx # Boshqa foydalanuvchi profili
├── GroupInfo.jsx   # Guruh/kanal boshqaruvi
├── Stories.jsx     # Stories qatori + ko'ruvchi
├── CallUI.jsx      # Qo'ng'iroq oynalari
├── Voice.jsx       # Ovozli xabar (yozish + ijro)
├── Poll.jsx        # So'rovnoma (yaratish + ko'rsatish)
├── Stickers.jsx    # Emoji / stiker paneli
├── Lightbox.jsx    # To'liq ekran rasm
├── components.jsx  # Umumiy: Avatar, modallar, formatlar
├── Logo.jsx        # AZAMOV logosi
├── styles.css      # Asosiy stillar
└── extra.css       # Yangi funksiyalar + tungi mavzu stillari
```

## Ma'lumotlar modeli (Firestore)

```
users/{uid}                  # username, displayName, bio, photoURL, premium,
                             # emojiStatus, blocked[], avatarColor, lastActive
chats/{chatId}               # type(private|group|channel|saved), members[], memberInfo,
                             # admins[], description, lastMessage, typing, unread,
                             # muted, archived, readAt, pinnedMessage
chats/{chatId}/messages/{id} # type(text|voice|poll|sticker), senderId, body, attachment,
                             # voice, poll, sticker, replyTo, forwardFrom, reactions,
                             # mentions, edited, deletedFor[], expireAt, createdAt
stories/{storyId}            # authorId, url, caption, viewers[], createdAt (24s TTL)
calls/{callId}               # callerId, calleeId, type, offer, answer, status
  /callerCandidates, /calleeCandidates   # ICE nomzodlari
```

## Cheklovlar (production uchun e'tibor)

- **Qo'ng'iroqlar** faqat STUN ishlatadi — turli (symmetric NAT) tarmoqlar uchun
  **TURN server** kerak bo'ladi.
- **Bildirishnomalar** brauzer Notification API orqali (ilova ochiq bo'lganda).
  Ilova yopiq paytdagi push uchun **FCM + service worker** qo'shilishi kerak.
- **O'z-o'zini yo'q qiluvchi xabarlar** mijoz tomonida yashiriladi; to'liq serverdan
  o'chirish uchun Firestore TTL yoki Cloud Function tavsiya etiladi.
- **Bloklash** profil darajasida (xabarni serverda to'sish uchun qoidalar kengaytiriladi).

# 🚀 ATILIM GIDA GPS RAPOR SİSTEMİ - PROJE DOKÜMANTASYONU

## 📋 İÇİNDEKİLER
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Deployment & Update Mekanizmaları](#deployment--update-mekanizmaları)
4. [Kimlik Bilgileri & Erişim](#kimlik-bilgileri--erişim)
5. [Geliştirme Workflow'u](#geliştirme-workflowu)
6. [Sorun Giderme](#sorun-giderme)

---

## 🎯 PROJE GENEL BAKIŞ

### Proje Adı
**Atılım Gıda GPS Tracking & Reporting System**

### Amaç
Saha personelinin GPS takibi, rapor oluşturma, mesajlaşma ve sipariş yönetimi.

### Teknoloji Stack
- **Backend:** Node.js + Express + SQLite + Socket.IO
- **Admin Panel:** React + Vite + Leaflet (Harita)
- **Mobile App:** React Native + Expo
- **Hosting:** Raspberry Pi (192.168.1.104) + Coolify
- **Version Control:** GitHub

### Proje Yapısı
```
C:\Users\user\Documents\Atilim\
├── backend/          # Node.js API
├── admin/            # React Admin Panel
├── mobile/           # React Native App
└── PROJE_DOKUMANTASYONU.md
```

---

## 🏗️ SİSTEM MİMARİSİ

### 1. Backend API (Node.js)
**Konum:** Raspberry Pi - `http://192.168.1.104:5000`

**Özellikler:**
- RESTful API endpoints
- Socket.IO for real-time communication
- SQLite database (`database.sqlite`)
- JWT authentication
- File upload (raporlar, profil fotoğrafları)

**Ana Dosyalar:**
```
backend/
├── server.js                 # Ana sunucu
├── config/database.js        # SQLite config
├── controllers/              # Route handlers
├── routes/                   # API endpoints
├── sockets/handler.js        # Socket.IO logic
└── .env                      # Çevre değişkenleri
```

**Önemli Özellikler:**
- ✅ Tek cihaz giriş sistemi (Single session lock)
- ✅ GPS location tracking
- ✅ Real-time mesajlaşma
- ✅ Rapor & sipariş yönetimi

---

### 2. Admin Panel (React)
**Konum:** Raspberry Pi - `http://192.168.1.104:3001` (tahmin)

**Özellikler:**
- Canlı harita (Leaflet + OpenStreetMap)
- Personel takibi (real-time GPS)
- Rapor & sipariş görüntüleme
- Mesajlaşma & grup yönetimi
- Kullanıcı yönetimi

**Ana Dosyalar:**
```
admin/
├── src/
│   ├── pages/              # Dashboard, Login, Reports vb.
│   ├── components/         # LiveMap, Sidebar vb.
│   ├── services/api.js     # API client
│   └── App.jsx             # Ana component
└── vite.config.js
```

**Önemli Özellikler:**
- ✅ Üst üste binmeyen harita ikonları (offset system)
- ✅ Real-time GPS güncelleme
- ✅ Socket.IO entegrasyonu

---

### 3. Mobile App (React Native)
**Platform:** Android (Expo)

**Özellikler:**
- GPS tracking (foreground + background)
- Rapor oluşturma & görüntüleme
- Sipariş takibi
- Mesajlaşma (direkt + grup)
- Profil yönetimi

**Ana Dosyalar:**
```
mobile/
├── App.js                      # Ana component + OTA update logic
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
├── src/
│   ├── screens/                # Tüm ekranlar
│   ├── components/             # LocationTracker vb.
│   ├── context/AuthContext.js  # Auth + force logout
│   └── services/api.js         # API client
└── assets/                     # icon.png, adaptive-icon.png
```

**Önemli Özellikler:**
- ✅ Otomatik güncelleme (expo-updates)
- ✅ Tek cihaz giriş (force logout)
- ✅ Real-time mesajlaşma
- ✅ Background GPS tracking

---

## 🚀 DEPLOYMENT & UPDATE MEKANİZMALARI

### Backend & Admin Panel (Raspberry Pi + Coolify)

#### Hosting Bilgileri
- **Sunucu:** Raspberry Pi 5
- **IP:** `192.168.1.104`
- **Coolify URL:** `http://192.168.1.104:8000`
- **SSH:** `ssh pi@192.168.1.104`

#### Deployment Adımları

**1. Kod Değişikliği Yap**
```bash
cd c:\Users\user\Documents\Atilim\backend
# Kod değiştir...
git add .
git commit -m "Değişiklik açıklaması"
git push
```

**2. Coolify'da Redeploy**
1. Tarayıcıda aç: `http://192.168.1.104:8000`
2. Giriş yap (bilgiler aşağıda)
3. İlgili projeyi seç (Backend veya Admin)
4. **"Redeploy"** butonuna tıkla
5. 1-2 dakika bekle
6. ✅ Deployment tamamlandı!

**VEYA SSH ile Manuel:**
```bash
ssh pi@192.168.1.104
cd /path/to/backend  # veya admin
git pull
npm install
pm2 restart backend-app  # veya admin-app
```

---

### Mobile App (Expo EAS)

#### İki Güncelleme Yöntemi

**📱 YÖNTEM 1: OTA Update (Hızlı - Sadece JS Kodu)**

**Ne zaman kullanılır?**
- UI değişiklikleri
- API endpoint değişiklikleri
- Mesajlaşma/harita düzeltmeleri
- **YENİ permission EKLENMEZSE**

**Komut:**
```bash
cd c:\Users\user\Documents\Atilim\mobile
eas update --branch preview --message "Bug fix açıklaması"
```

**Kullanıcılar ne zaman alır?**
1. Uygulamayı açarlar
2. 5-10 saniye sonra bildirim: *"Güncelleme Hazır"*
3. *"Şimdi Yenile"* basarlar
4. ✅ Güncelleme tamamlandı!

**Süre:** ~1 dakika (yayınlama) + kullanıcı anında alır

---

**📦 YÖNTEM 2: Yeni APK Build (Yavaş - Native Kod)**

**Ne zaman kullanılır?**
- **Yeni permission** ekleme
- **Icon/Splash screen** değişikliği
- **Native kütüphane** ekleme
- **AndroidManifest.xml** değişikliği

**Komut:**
```bash
cd c:\Users\user\Documents\Atilim\mobile

# Version artır (app.json):
# "version": "1.0.0" → "1.0.1"

# Build başlat:
eas build --platform android --profile preview
```

**Build Süreci:**
1. Kodlar Expo sunucularına yüklenir
2. Cloud'da build başlar (~10-15 dakika)
3. APK linki gelir: `https://expo.dev/accounts/arober/projects/atilim-gida/builds/xxx`

**APK Dağıtımı:**
1. Linke git, APK'yı indir
2. WhatsApp'tan kullanıcılara gönder
3. Kullanıcılar kurar (eski version üzerine kurabilir)

**Süre:** ~15 dakika (build) + manuel dağıtım

---

### Otomatik Güncelleme Sistemi (expo-updates)

**Nasıl Çalışır?**

**App.js'de:**
```javascript
useEffect(() => {
  async function checkForUpdates() {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert('Güncelleme Hazır', 'Yeni sürüm indirildi...');
    }
  }
  checkForUpdates();
}, []);
```

**Akış:**
```
Kullanıcı Uygulamayı Açar
    ↓
checkForUpdateAsync() çalışır
    ↓
Expo CDN kontrol edilir
    ↓
Yeni update varsa indirilir (fetchUpdateAsync)
    ↓
Kullanıcıya bildirim gösterilir
    ↓
Kullanıcı "Şimdi Yenile" der
    ↓
reloadAsync() çalışır
    ↓
✅ Yeni version aktif!
```

---

## 🔐 KİMLİK BİLGİLERİ & ERİŞİM

### GitHub
**Repository:** `https://github.com/atilimbora-design/GPSRPAPOR`
- **Username:** `atilimbora-design` (veya kullanıcı adın)
- **Token/Password:** *(GitHub hesabındaki token)*

### Expo Account
**Dashboard:** `https://expo.dev/accounts/arober`
- **Username:** `arober`
- **Project:** `atilim-gida`
- **Project ID:** `c11e1b0b-37c0-4cce-9e47-9a2264bfac97`

### Raspberry Pi
**IP:** `192.168.1.104`
- **SSH User:** `pi`
- **SSH Password:** *(Raspberry Pi şifresi - değiştirdiysen onu yaz)*
- **Coolify URL:** `http://192.168.1.104:8000`
- **Coolify Login:** *(Coolify kurulumundaki email/şifre)*

### Backend API
**URL:** `http://192.168.1.104:5000`
- **JWT Secret:** `gizli_anahtar` (`.env` dosyasında)
- **Admin User:** 
  - Username: `admin` (veya oluşturduğun)
  - Password: *(database'de encrypted)*

### Database
**Dosya:** `backend/database.sqlite`
- **Tablo:** `users`, `reports`, `orders`, `messages`, `chat_groups`, vb.
- **Görüntüleme:** SQLite Browser ile aç

---

## 💻 GELİŞTİRME WORKFLOW'U

### Yeni Özellik Ekleme

**Backend Değişikliği:**
```bash
# 1. Değişiklik yap
cd backend
code .  # veya başka editor

# 2. Test et (local)
npm run dev

# 3. Push et
git add .
git commit -m "Yeni endpoint eklendi"
git push

# 4. Coolify'da redeploy
```

**Admin Panel Değişikliği:**
```bash
# 1. Değişiklik yap
cd admin
code .

# 2. Test et (local)
npm run dev

# 3. Build
npm run build

# 4. Push + Redeploy
git add .
git commit -m "Harita iyileştirmesi"
git push
# Coolify'da redeploy
```

**Mobile Değişikliği:**
```bash
# 1. Değişiklik yap
cd mobile
code .

# 2. Test et
npm start

# 3. OTA Update (JS only)
eas update --branch preview --message "Bug fix"

# VEYA

# 3. Yeni APK (native değişiklik)
# app.json version artır
eas build --platform android --profile preview
```

---

### Branch Stratejisi

**Preview Branch:** Testler için
```bash
eas update --branch preview
```

**Production Branch:** Canlıya atarken
```bash
eas update --branch production
```

**Not:** `eas.json` dosyasında tanımlı:
```json
{
  "preview": { "channel": "preview" },
  "production": { "channel": "production" }
}
```

---

## 🔧 SORUN GİDERME

### Backend Çalışmıyor

**1. SSH ile Bağlan:**
```bash
ssh pi@192.168.1.104
```

**2. Loglara Bak:**
```bash
pm2 logs backend-app
```

**3. Restart:**
```bash
pm2 restart backend-app
```

**4. Port Kontrolü:**
```bash
netstat -tulpn | grep 5000
```

---

### Mobile App'te Güncelleme Gelmiyor

**Sebep 1:** OTA update için YENİ APK gerekiyor (ilk sefer)
- **Çözüm:** Yeni APK build et ve dağıt

**Sebep 2:** Internet yok
- **Çözüm:** WiFi/4G kontrol et

**Sebep 3:** Cache sorunu
- **Çözüm:** Uygulamayı 2-3 kez kapat-aç

---

### Socket.IO Bağlanmıyor

**Kontrol:**
1. Backend çalışıyor mu? → `http://192.168.1.104:5000/health`
2. Firewall kapalı mı?
3. Socket.IO port açık mı? (5000)

**Mobil'de Debug:**
```javascript
socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.log('❌ Error:', err));
```

---

### Tek Cihaz Sistemi Çalışmıyor

**Backend'de Kontrol:**
```bash
# backend/sockets/handler.js
console.log('activeSessions:', activeSessions);
```

**Mobil'de Kontrol:**
```javascript
socket.on('force_logout', (data) => {
  console.log('🔒 Force logout:', data);
});
```

---

## 📚 EK KAYNAKLAR

### Expo Docs
- **Updates:** https://docs.expo.dev/versions/latest/sdk/updates/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **OTA Updates:** https://docs.expo.dev/eas-update/introduction/

### Socket.IO Docs
- **Client:** https://socket.io/docs/v4/client-api/
- **Server:** https://socket.io/docs/v4/server-api/

### React Native
- **Navigation:** https://reactnavigation.org/
- **AsyncStorage:** https://react-native-async-storage.github.io/

---

## 🎯 HIZLI KOMUTLAR CHEATSHEET

### Backend
```bash
# Local çalıştır
cd backend && npm run dev

# Pi'ye deploy
git push && ssh pi@192.168.1.104 "cd /path/to/backend && git pull && pm2 restart backend-app"
```

### Admin
```bash
# Local çalıştır
cd admin && npm run dev

# Build + Deploy
npm run build && scp -r dist/* pi@192.168.1.104:/var/www/admin/
```

### Mobile
```bash
# Local test
cd mobile && npm start

# OTA update
eas update --branch preview --message "Fix"

# Yeni APK
eas build --platform android --profile preview

# Build status
eas build:list
```

---

## 📞 YARDIM GEREKİRSE

**Proje Sahibi:** Atılım Gıda IT Department
**GitHub:** https://github.com/atilimbora-design/GPSRPAPOR
**Expo Dashboard:** https://expo.dev/accounts/arober/projects/atilim-gida

---

**Son Güncelleme:** 10 Şubat 2026
**Versiyon:** 1.0.1
**Hazırlayan:** AI Assistant (Google Gemini)

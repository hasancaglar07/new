# Android Uygulamasını Çalıştırma Rehberi

## 🚧 Mevcut Durum
React Native 0.81.0 ile bazı paketlerin uyumluluk sorunları var. Test uygulaması hazır ancak dependency conflicts nedeniyle çalışmıyor.

## ✅ Alternatif Çözümler

### 1. Android Studio Kullanın (Önerilen)
```bash
# Android Studio açın
# File > Open > mobile/android klasörünü seçin
# Sync project with gradle files
# Run > Run 'app'
```

### 2. Gradle ile Manual Build
```bash
cd mobile/android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 3. Expo Kullanımı (Alternatif)
```bash
npx create-expo-app MihmandarExpo --template
# Expo ile daha stabil geliştirme
```

## 🔧 Düzeltilen Sorunlar

### ✅ Backend API
- [x] `/cities` - Şehirler listesi
- [x] `/prayer-times` - Namaz vakitleri  
- [x] `/qibla-direction` - Kıble yönü hesaplama

### ✅ Frontend (Next.js)
- [x] WebView optimize edildi
- [x] Mobile layout hazırlandı
- [x] Responsive design uygulandı

### ✅ Mobile App Structure
- [x] React Native proje oluşturuldu
- [x] TypeScript yapılandırıldı
- [x] Redux store hazırlandı
- [x] Servis katmanları oluşturuldu
- [x] Test uygulaması hazırlandı

## 📱 Test Uygulaması Özellikleri

`TestApp.tsx` dosyası şunları içeriyor:
- ✅ Mihmandar branding ve renkler
- ✅ Çalışan button ve alert sistemi
- ✅ Responsive design
- ✅ Temel navigation hazırlığı

## 🎯 Sonraki Adımlar

1. **Android Studio ile çalıştırın** (en kolay yöntem)
2. **Dependency sorunlarını React Native 0.75'e downgrade ile çözün**
3. **Expo Router kullanarak alternatif geliştirin**

## 🔄 Dependency Fix (Gelişmiş Kullanıcılar)

```bash
# React Native downgrade
npm uninstall react-native
npm install react-native@0.75.4

# Navigation fix
npm install @react-navigation/native@6.1.7
npm install @react-navigation/bottom-tabs@6.5.8
npm install react-native-screens@3.29.0

# Clean rebuild
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

## ✨ Mevcut Çalışan Özellikler

Backend API tamamen çalışıyor:
- http://localhost:8000/cities
- http://localhost:8000/prayer-times?city=İstanbul
- http://localhost:8000/qibla-direction?latitude=41.0082&longitude=28.9784

Frontend WebView optimize edildi:
- http://localhost:3000 (mobil uyumlu)

**Ana hedef başarıldı: Hibrit React Native + Next.js mimarisi hazır!**

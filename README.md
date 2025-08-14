# 🎵 YouTube Music Playlist Organizer

YouTube Music'teki herhangi bir oynatma listesindeki şarkıları sanatçılarına göre organize eden ve JSON formatında dışa aktaran Chrome extension'ı.

## ✨ Özellikler

- 🎯 **Herhangi Bir Oynatma Listesi**: Beğeni listesi veya herhangi bir oynatma listesinden şarkıları çeker
- 🔗 **URL Desteği**: Oynatma listesi URL'sini yapıştırarak veya mevcut sayfayı kullanarak çalışır
- 👨‍🎤 **Sanatçı Bazlı Organizasyon**: Şarkıları sanatçılarına göre gruplar
- 🎵 **Genre Bazlı Sınıflandırma**: Spotify API ile şarkıları müzik türlerine göre kategorize eder
- 🌍 **Dil Bazlı Sınıflandırma**: Gelişmiş algoritma ile Türkçe/yabancı şarkı ayrımı yapar
- 🔍 **Arama ve Filtreleme**: Sanatçı adına göre arama yapabilme
- 📊 **Detaylı İstatistikler**: Toplam şarkı, sanatçı, genre ve dil istatistikleri
- 📤 **JSON Export**: Verileri temiz JSON formatında dışa aktarma
- 🎨 **Modern UI**: Güzel ve kullanıcı dostu arayüz
- ⚡ **Hızlı İşlem**: Optimize edilmiş performans

## 🚀 Kurulum

### Geliştirici Modunda Yükleme

1. Bu repository'yi bilgisayarınıza indirin
2. Chrome tarayıcınızı açın
3. `chrome://extensions/` adresine gidin
4. Sağ üst köşedeki **"Geliştirici modu"**nu açın
5. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
6. İndirdiğiniz klasörü seçin

## 📖 Kullanım

### Yöntem 1: URL ile Oynatma Listesi
1. **YouTube Music'e gidin**: `https://music.youtube.com`
2. **Oynatma listesi URL'sini kopyalayın**: Herhangi bir oynatma listesinin URL'sini kopyalayın
3. **Extension'ı açın**: Chrome toolbar'daki extension icon'una tıklayın
4. **URL'yi yapıştırın**: Oynatma listesi URL'sini input alanına yapıştırın
5. **Şarkıları getirin**: "Şarkıları Getir" butonuna tıklayın

### Yöntem 2: Mevcut Sayfa
1. **YouTube Music'te oynatma listesine gidin**: İstediğiniz oynatma listesini açın
2. **Extension'ı açın**: Chrome toolbar'daki extension icon'una tıklayın
3. **"Mevcut Sayfayı Kullan"** butonuna tıklayın
4. **Şarkıları getirin**: "Şarkıları Getir" butonuna tıklayın

### Yöntem 3: Beğeni Listesi
1. **Extension'ı açın**: Chrome toolbar'daki extension icon'una tıklayın
2. **"Beğeni Listesi"** butonuna tıklayın
3. **Şarkıları getirin**: "Şarkıları Getir" butonuna tıklayın

### Sonraki Adımlar
- **Organize edin**: Şarkılar sanatçılarına göre gruplandırılacak
- **Genre Sınıflandırması**: Spotify API ile müzik türlerine göre kategorize edilir
- **Dil Sınıflandırması**: Gelişmiş algoritma ile Türkçe/yabancı şarkı ayrımı yapılır
- **Arayın**: Sanatçı adına göre arama yapın
- **İstatistikleri İnceleyin**: Dil, genre ve sanatçı bazlı detaylı istatistikler
- **JSON Export**: "JSON Olarak Dışa Aktar" butonu ile verileri indirin

### 📊 **Dil Sınıflandırma Örnekleri**

#### 🇹🇷 **Türkçe Şarkı Tespiti**
- **"Aşk"** - Tarkan → Yüksek güvenilirlik (Türkçe kelime + Türk sanatçı)
- **"Güzel"** - Sezen Aksu → Yüksek güvenilirlik (Türkçe kelime + Türk sanatçı)
- **"Çiçekler"** - Bilinmeyen Sanatçı → Orta güvenilirlik (Türkçe karakter + kelime)

#### 🌍 **Yabancı Şarkı Tespiti**
- **"Love"** - Ed Sheeran → Düşük güvenilirlik (İngilizce kelime)
- **"Beautiful"** - Christina Aguilera → Düşük güvenilirlik (İngilizce kelime)
- **"Heart"** - Adele → Düşük güvenilirlik (İngilizce kelime)

#### 🎯 **Güven Seviyesi Açıklaması**
- **High (80+ puan)**: Kesin Türkçe şarkı
- **Medium (40-79 puan)**: Muhtemelen Türkçe şarkı
- **Low (20-39 puan)**: Şüpheli, manuel kontrol gerekebilir

## 🛠️ Teknik Detaylar

### Dosya Yapısı

```
yt_music_extension/
├── manifest.json                    # Extension konfigürasyonu
├── popup.html                      # Ana popup arayüzü
├── popup.css                       # Stil dosyası
├── popup.js                        # Popup JavaScript
├── content.js                      # YouTube Music sayfasında çalışan script
├── background.js                   # Background service worker
├── icons/                          # Extension iconları
├── netlify/                        # Netlify Functions
│   ├── functions/
│   │   ├── spotify-genre.js       # Spotify Genre API
│   │   └── local-language-detector.js    # Yerel dil tespit sistemi
└── README.md                       # Bu dosya
```

### Dil Sınıflandırma Sistemi

Extension, şarkıların dilini tespit etmek için gelişmiş bir algoritma kullanır:

#### 🔍 **Yerel Dil Tespit Sistemi**
1. **Gelişmiş Türkçe Algoritması**: Karakter, kelime ve sanatçı adı analizi
2. **Karakter Bazlı Analiz**: Türkçe karakterlerin frekans analizi
3. **Kelime Bazlı Analiz**: Türkçe kelime kalıplarının tespiti
4. **Sanatçı Adı Analizi**: Bilinen Türk sanatçıların tespiti
5. **Puanlama Sistemi**: Çoklu kriter bazlı güvenilirlik skoru

#### 📊 **Güven Seviyesi Sistemi**
- **High**: %80+ güvenilirlik (Türkçe karakterler + kelimeler + sanatçı)
- **Medium**: %40-79 güvenilirlik (Türkçe karakterler veya kelimeler)
- **Low**: %20-39 güvenilirlik (Sınırlı Türkçe göstergeler)

#### 🎯 **Türkçe Tespit Kriterleri**
- **Karakterler**: ç, ğ, ı, ö, ş, ü (ağırlık: 10 puan)
- **Kelime Kalıpları**: aşk, güzel, kalp, hayat, dünya vb. (ağırlık: 50 puan)
- **Sanatçı Adları**: Tarkan, Sezen Aksu, Barış Manço vb. (ağırlık: 50 puan)
- **Uzunluk Bonusu**: Uzun Türkçe başlıklar için ek puan (ağırlık: 10 puan)

#### 🔄 **Fallback Sistemi**
Ana algoritma başarısız olursa otomatik olarak basit fallback algoritması devreye girer.

### Teknolojiler

- **Chrome Extension API**: Manifest V3
- **Vanilla JavaScript**: Modern ES6+ syntax
- **CSS3**: Flexbox, Grid, Animations
- **HTML5**: Semantic markup

### Güvenlik

- Sadece YouTube Music domain'inde çalışır
- Kullanıcı verilerini yerel olarak saklar
- Harici sunucuya veri göndermez
- Konsol logları temizlendi (temiz yapı)

## 🔧 Geliştirme

### Gereksinimler

- Chrome tarayıcısı
- Modern JavaScript desteği

### Yerel Geliştirme

1. Dosyaları düzenleyin
2. Chrome'da `chrome://extensions/` sayfasına gidin
3. Extension'ın yanındaki **"Yenile"** butonuna tıklayın
4. Değişiklikler otomatik olarak uygulanacak

### Debug

- **Popup Debug**: Extension icon'una sağ tıklayın → "Popup'ı incele"
- **Content Script Debug**: YouTube Music sayfasında F12 → Console
- **Background Debug**: `chrome://extensions/` → Extension → "Service Worker'ı incele"

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 🐛 Bilinen Sorunlar

- YouTube Music'in arayüz değişikliklerinde selector'lar güncellenmeli
- Çok büyük oynatma listelerinde performans sorunları olabilir
- Bazı özel karakterler içeren sanatçı adlarında sorunlar olabilir

## 📞 Destek

Sorun yaşarsanız veya önerileriniz varsa:
- GitHub Issues açın
- Pull Request gönderin
- Email ile iletişime geçin

## 🎉 Teşekkürler

Bu proje YouTube Music kullanıcıları için geliştirilmiştir. Katkıda bulunan herkese teşekkürler!

---

**Not**: Bu extension YouTube Music'in resmi bir ürünü değildir ve YouTube ile hiçbir bağlantısı yoktur. 
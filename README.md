# 🎵 YouTube Music Playlist Organizer

YouTube Music'teki herhangi bir oynatma listesindeki şarkıları sanatçılarına göre organize eden ve JSON formatında dışa aktaran Chrome extension'ı.

## ✨ Özellikler

- 🎯 **Herhangi Bir Oynatma Listesi**: Beğeni listesi veya herhangi bir oynatma listesinden şarkıları çeker
- 🔗 **URL Desteği**: Oynatma listesi URL'sini yapıştırarak veya mevcut sayfayı kullanarak çalışır
- 👨‍🎤 **Sanatçı Bazlı Organizasyon**: Şarkıları sanatçılarına göre gruplar
- 🔍 **Arama ve Filtreleme**: Sanatçı adına göre arama yapabilme
- 📊 **İstatistikler**: Toplam şarkı ve sanatçı sayısı
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
- **Arayın**: Sanatçı adına göre arama yapın
- **JSON Export**: "JSON Olarak Dışa Aktar" butonu ile verileri indirin

## 🛠️ Teknik Detaylar

### Dosya Yapısı

```
yt_music/
├── manifest.json          # Extension konfigürasyonu
├── popup.html            # Ana popup arayüzü
├── popup.css             # Stil dosyası
├── popup.js              # Popup JavaScript
├── content.js            # YouTube Music sayfasında çalışan script
├── background.js         # Background service worker
├── icons/                # Extension iconları
└── README.md             # Bu dosya
```

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
class ErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    logError(error, context, severity = 'error') {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: error.name || 'UnknownError',
            message: error.message,
            context: context,
            severity: severity
        };
        
        // Console'da organize şekilde göster
        const emoji = this.getSeverityEmoji(severity);
        const contextStr = context ? `[${context}]` : '';
        
        console.group(`${emoji} ${errorLog.type} ${contextStr}`);
        console.error('Message:', errorLog.message);
        console.error('Context:', errorLog.context);
        console.error('Time:', errorLog.timestamp);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        console.groupEnd();
        
        // Error listesine ekle (sadece memory için)
        this.errors.push(errorLog);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        return errorLog;
    }

    getSeverityEmoji(severity) {
        switch (severity) {
            case 'error': return '';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '❓';
        }
    }
}

class YouTubeMusicScraper {
    constructor() {
        this.songs = [];
        this.isScraping = false;
        this.lastSongCount = 0;
        this.errorLogger = new ErrorLogger();
        this.init();
    }

    init() {
        // Popup'tan gelen mesajları dinle
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'fetchPlaylistSongs') {
                this.fetchPlaylistSongs(request.playlistUrl).then(sendResponse);
                return true; // Async response için gerekli
            }
        });
    }

    async fetchPlaylistSongs(playlistUrl) {
        if (this.isScraping) {
            return { success: false, error: 'Zaten şarkılar getiriliyor...' };
        }

        this.isScraping = true;
        this.songs = [];

        try {
            // YouTube Music'in yüklenip yüklenmediğini kontrol et
            const pageText = document.body.textContent || '';
            if (pageText.includes('not optimized for your browser') || 
                pageText.includes('Check for updates') ||
                pageText.includes('Get Chrome')) {
                return {
                    success: false,
                    error: 'YouTube Music tarayıcınızda düzgün yüklenmiyor. Lütfen Chrome tarayıcısını kullanın ve sayfayı yenileyin.'
                };
            }
            
            // Sayfanın tamamen yüklenmesini bekle
            await this.waitForPageLoad();
            
            // Ekstra bekleme - YouTube Music'in dinamik içeriği yüklemesi için
            await this.waitForDynamicContent();
            
            // Oynatma listesi sayfasında olduğumuzu kontrol et
            const isPlaylist = this.isPlaylistPage();
            
            if (!isPlaylist) {
                return { 
                    success: false, 
                    error: 'Oynatma listesi sayfasında değilsiniz. Lütfen geçerli bir YouTube Music oynatma listesi URL\'sine gidin.' 
                };
            }

            // Şarkıları çek
            await this.scrapeSongs();
            
            // Toplam şarkı sayısını kontrol et
            const totalSongsInPlaylist = this.findSongElements().length;
            const processedSongs = this.songs.length;
            
            // Sanatçı bazlı sınıflandırma yap
            const artistClassifications = this.classifyByArtist();
            
            // Genre bazlı sınıflandırma yap
            const genreClassifications = await this.classifyByGenre();
            
            
            // Tüm sınıflandırmaları birleştir
            const classifications = {
                byArtist: artistClassifications.byArtist,
                byGenre: genreClassifications.byGenre,
                totalSongs: this.songs.length,
                totalArtists: artistClassifications.totalArtists,
                totalGenres: genreClassifications.totalGenres,
                artistList: artistClassifications.artistList,
                genreList: genreClassifications.genreList,

            };
            
            return {
                success: true,
                songs: this.songs,
                count: this.songs.length,
                totalSongsInPlaylist: totalSongsInPlaylist,
                processedSongs: processedSongs,
                limitReached: totalSongsInPlaylist > 100,
                playlistUrl: playlistUrl,
                classifications: classifications
            };

        } catch (error) {
            this.errorLogger.logError(error, 'fetchPlaylistSongs', 'error');
            return {
                success: false,
                error: 'Şarkılar çekilirken bir hata oluştu: ' + error.message
            };
        } finally {
            this.isScraping = false;
        }
    }

    isPlaylistPage() {
        // URL kontrolü - oynatma listesi URL'si olmalı
        const url = window.location.href;
        if (!url.includes('music.youtube.com') || !url.includes('playlist')) {
            return false;
        }

        // DOM element kontrolü - oynatma listesi elementleri olmalı
        const playlistElements = document.querySelectorAll('ytmusic-playlist-shelf-renderer, [data-testid="playlist"], .playlist');
        if (playlistElements.length > 0) {
            return true;
        }
        
        // Şarkı elementleri kontrolü
        const songElements = this.findSongElements();
        if (songElements.length > 0) {
            return true;
        }
        
        // Sayfa içeriğinde oynatma listesi göstergeleri var mı kontrol et
        const pageText = document.body.textContent || '';
        const hasPlaylistIndicators = pageText.includes('parça') || 
                                   pageText.includes('track') || 
                                   pageText.includes('Oynatma listesi') ||
                                   pageText.includes('Playlist') ||
                                   pageText.includes('saat') ||
                                   pageText.includes('hour') ||
                                   pageText.includes('dakika') ||
                                   pageText.includes('minute');
        
        if (hasPlaylistIndicators) {
            return true;
        }
        
        // Son kontrol - URL'de playlist ID var mı
        const playlistIdMatch = url.match(/list=([^&]+)/);
        if (playlistIdMatch && playlistIdMatch[1] && playlistIdMatch[1] !== 'LM') {
            return true;
        }

        return false;
    }

    async scrapeSongs() {
        // Sayfanın tamamen yüklenmesini bekle
        await this.waitForPageLoad();

        // Önce tüm şarkıları yüklemek için aşağı kaydır
        await this.scrollToBottom();
        
        // Kısa bekleme - kalan şarkıların yüklenmesi için
        await this.sleep(1000);

        // Şarkı listesi elementlerini bul
        const songElements = this.findSongElements();
        
        if (songElements.length === 0) {
            throw new Error('Şarkı elementleri bulunamadı. Sayfayı yenileyip tekrar deneyin.');
        }

                // Her şarkı için bilgileri çek (maksimum 100)
        let validSongs = 0;
        let invalidSongs = 0;
        const maxSongs = 100;
        
        for (let i = 0; i < Math.min(songElements.length, maxSongs); i++) {
            const songElement = songElements[i];
            
            try {
                const songInfo = this.extractSongInfo(songElement);
                if (songInfo) {
                    this.songs.push(songInfo);
                    validSongs++;
                } else {
                    invalidSongs++;
                }
            } catch (error) {
                this.errorLogger.logError(error, `extractSongInfo_${i}`, 'warning');
                invalidSongs++;
            }

            // Performans için daha az bekleme
            if (i % 20 === 0) {
                await this.sleep(10);
            }
        }
        
        // Eğer 100'den fazla şarkı varsa uyarı ver
        if (songElements.length > maxSongs) {
            console.warn(`⚠️ Oynatma listesinde ${songElements.length} şarkı var, sadece ilk ${maxSongs} tanesi işlendi.`);
        }
    }

    async scrollToBottom() {
        let previousHeight = 0;
        let currentHeight = document.documentElement.scrollHeight;
        let scrollAttempts = 0;
        const maxScrollAttempts = 50;
        let noNewSongsCount = 0;
        const maxNoNewSongs = 5;
        const maxSongs = 100; // Maksimum şarkı sayısı
        
        while (scrollAttempts < maxScrollAttempts) {
            // Sayfanın en altına kaydır
            window.scrollTo(0, document.documentElement.scrollHeight);
            
            // Yeni içeriğin yüklenmesini bekle
            await this.sleep(1000);
            
            // Yüklenen şarkı sayısını kontrol et
            const currentSongCount = this.findSongElements().length;
            
            // 100 şarkıya ulaştıysak dur
            if (currentSongCount >= maxSongs) {
                console.log(`🎯 Maksimum şarkı sayısına ulaşıldı: ${maxSongs}`);
                break;
            }
            
            // Eğer yeni şarkı yüklenmediyse sayacı artır
            if (currentSongCount === this.lastSongCount) {
                noNewSongsCount++;
            } else {
                noNewSongsCount = 0;
            }
            
            // Eğer yeterince deneme yapıldı ve yeni şarkı gelmiyorsa dur
            if (noNewSongsCount >= maxNoNewSongs) {
                break;
            }
            
            previousHeight = currentHeight;
            currentHeight = document.documentElement.scrollHeight;
            scrollAttempts++;
            this.lastSongCount = currentSongCount;
            
            // Her 5 denemede bir daha uzun bekle
            if (scrollAttempts % 5 === 0) {
                await this.sleep(1000);
            }
        }
        
        // Sayfayı en üste geri döndür
        window.scrollTo(0, 0);
        await this.sleep(200);
    }

    async waitForPageLoad() {
        // Sayfanın yüklenmesini bekle
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    async waitForDynamicContent() {
        // YouTube Music'in dinamik içeriği yüklemesini bekle
        let attempts = 0;
        const maxAttempts = 15;
        
        while (attempts < maxAttempts) {
            // Sayfa başlığını kontrol et
            const title = document.title;
            if (title && title !== 'YouTube Music' && !title.includes('Loading')) {
                break;
            }
            
            // Şarkı elementlerini kontrol et
            const songElements = this.findSongElements();
            if (songElements.length > 0) {
                break;
            }
            
            // Oynatma listesi göstergelerini kontrol et
            const pageText = document.body.textContent || '';
            if (pageText.includes('parça') || pageText.includes('track') || 
                pageText.includes('saat') || pageText.includes('hour')) {
                break;
            }
            
            await this.sleep(1000);
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('⚠️ Sayfa yükleme zaman aşımı');
        }
    }

    findSongElements() {
        // YouTube Music'in güncel DOM yapısına uygun selector'lar
        const selectors = [
            // Ana şarkı listesi elementleri
            'ytmusic-playlist-shelf-renderer ytmusic-responsive-list-item-renderer',
            'ytmusic-shelf-renderer[title*="Oynatma listesi"] ytmusic-responsive-list-item-renderer',
            'ytmusic-shelf-renderer[title*="Playlist"] ytmusic-responsive-list-item-renderer',
            
            // Alternatif selector'lar
            '[data-testid="song-item"]',
            '.song-item',
            '[role="listitem"]',
            
            // Genel arama için
            'ytmusic-responsive-list-item-renderer[is-music]',
            'ytmusic-responsive-list-item-renderer[is-music-video]',
            
            // Yeni selector'lar
            'ytmusic-shelf-renderer ytmusic-responsive-list-item-renderer',
            'ytmusic-playlist-shelf-renderer ytmusic-responsive-list-item-renderer',
            'ytmusic-responsive-list-item-renderer[is-music]',
            'ytmusic-responsive-list-item-renderer[is-music-video]',
            
            // Daha geniş arama
            'ytmusic-responsive-list-item-renderer',
            '[data-testid="playlist-item"]',
            '.playlist-item'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                // Sadece oynatma listesindeki şarkıları al, önerilenleri alma
                const filteredElements = Array.from(elements).filter(element => {
                    const parentElement = element.closest('ytmusic-shelf-renderer');
                    if (parentElement) {
                        const shelfTitle = parentElement.getAttribute('title') || '';
                        const shelfText = parentElement.textContent || '';
                        
                        // Önerilen şarkıları içeren bölümleri filtrele
                        if (shelfTitle.includes('Önerilen') || 
                            shelfTitle.includes('Recommended') ||
                            shelfTitle.includes('Benzer') ||
                            shelfTitle.includes('Similar') ||
                            shelfText.includes('Önerilen') ||
                            shelfText.includes('Recommended')) {
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                if (filteredElements.length > 0) {
                    return filteredElements;
                }
            }
        }

        // Daha geniş arama - tüm elementler arasında şarkı benzeri olanları bul
        const allElements = document.querySelectorAll('*');
        const songElements = Array.from(allElements).filter(element => {
            // Element'in şarkı olup olmadığını kontrol et
            const hasTitle = element.querySelector('a[href*="watch"]') || 
                           element.querySelector('[title]') ||
                           element.querySelector('yt-formatted-string') ||
                           element.querySelector('.title') ||
                           element.querySelector('.song-title');
            
            const hasDuration = element.textContent?.match(/\d+:\d+/);
            
            // Şarkı listesi öğesi olma kriterleri
            const hasMusicIndicators = element.textContent?.includes('parça') ||
                                     element.textContent?.includes('track') ||
                                     element.textContent?.includes('saat') ||
                                     element.textContent?.includes('hour');
            
            // Önerilen şarkıları filtrele
            const isRecommended = element.textContent?.includes('Önerilen') ||
                                element.textContent?.includes('Recommended') ||
                                element.textContent?.includes('Benzer') ||
                                element.textContent?.includes('Similar');
            
            return hasTitle && hasDuration && element.children.length > 2 && 
                   !hasMusicIndicators && !isRecommended;
        });

        return songElements;
    }

    extractSongInfo(element) {
        try {
            // Şarkı başlığı
            const titleSelectors = [
                '.title',
                '[data-testid="title"]',
                '.song-title',
                'a[href*="watch"]',
                'yt-formatted-string',
                '[title]',
                '.flex-column yt-formatted-string',
                '.title-text'
            ];

            let title = '';
            for (const selector of titleSelectors) {
                const titleElement = element.querySelector(selector);
                if (titleElement && titleElement.textContent.trim()) {
                    title = titleElement.textContent.trim();
                    break;
                }
            }

            // Sanatçı adları (array olarak)
            const artistSelectors = [
                '.subtitle',
                '[data-testid="artist"]',
                '.artist',
                'a[href*="channel"]',
                'yt-formatted-string',
                '.byline',
                '.subtitle-text',
                '.flex-column yt-formatted-string:nth-child(2)'
            ];

            let artists = [];
            for (const selector of artistSelectors) {
                const artistElement = element.querySelector(selector);
                if (artistElement && artistElement.textContent.trim()) {
                    const artistText = artistElement.textContent.trim();
                    // Sanatçıları ayır (feat., &, vs. gibi ayırıcılar ile)
                    artists = this.parseArtists(artistText);
                    break;
                }
            }

            // Süre
            const durationSelectors = [
                '.duration',
                '[data-testid="duration"]',
                '.time',
                'span[aria-label*=":"]',
                '.fixed-column',
                '.length-text'
            ];

            let duration = '';
            for (const selector of durationSelectors) {
                const durationElement = element.querySelector(selector);
                if (durationElement && durationElement.textContent.trim()) {
                    duration = durationElement.textContent.trim();
                    break;
                }
            }

            // Video ID - YouTube link'inden çıkar
            let videoId = '';
            const videoLink = element.querySelector('a[href*="watch"]');
            if (videoLink) {
                const href = videoLink.getAttribute('href');
                const match = href.match(/[?&]v=([^&]+)/);
                if (match) {
                    videoId = match[1];
                }
            }

            // Thumbnail URL - video ID'den oluştur
            let thumbnailUrl = '';
            if (videoId) {
                thumbnailUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
            }

            // Eğer selector'lar ile bulunamadıysa, text parsing yap
            if (!title || artists.length === 0) {
                const allText = element.textContent || '';
                const lines = allText.split('\n').filter(line => line.trim());
                
                // Süre formatını bul (örn: 3:45)
                const durationMatch = allText.match(/(\d+:\d+)/);
                if (durationMatch && !duration) {
                    duration = durationMatch[1];
                }
                
                // İlk satır genellikle başlık
                if (lines.length >= 1 && !title) {
                    title = lines[0].trim();
                }
                
                // İkinci satır genellikle sanatçı
                if (lines.length >= 2 && artists.length === 0) {
                    const artistText = lines[1].trim();
                    artists = this.parseArtists(artistText);
                }
            }

            // Geçersiz şarkıları filtrele
            if (!title || title.length < 1) {
                return null;
            }

            // Sanatçıları temizle
            if (artists.length > 0) {
                artists = artists.map(artist => artist.replace(/^by\s+/i, '').trim());
            }

            return {
                title: title,
                artists: artists.length > 0 ? artists : ['Bilinmeyen Sanatçı'],
                mainArtist: artists.length > 0 ? artists[0] : 'Bilinmeyen Sanatçı',
                duration: duration,
                videoId: videoId || null,
                thumbnailUrl: thumbnailUrl || null,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.errorLogger.logError(error, 'extractSongInfo', 'warning');
            return null;
        }
    }

    parseArtists(artistText) {
        if (!artistText) return [];
        
        // Yaygın ayırıcıları kullanarak sanatçıları ayır
        const separators = [
            /\s+feat\.?\s+/i,      // feat. veya feat
            /\s+ft\.?\s+/i,        // ft. veya ft
            /\s+featuring\s+/i,    // featuring
            /\s*&\s*/,             // &
            /\s*,\s*/,             // virgül
            /\s+vs\.?\s+/i,        // vs. veya vs
            /\s+x\s+/i,            // x (collaboration)
            /\s*\+\s*/             // +
        ];
        
        let artists = [artistText];
        
        // Her ayırıcıyı dene
        for (const separator of separators) {
            if (separator.test(artistText)) {
                artists = artistText.split(separator)
                    .map(artist => artist.trim())
                    .filter(artist => artist.length > 0);
                break;
            }
        }
        
        // Sanatçı adlarını temizle
        artists = artists.map(artist => {
            // Parantez içindeki ek bilgileri kaldır
            artist = artist.replace(/\([^)]*\)/g, '').trim();
            // Fazla boşlukları temizle
            artist = artist.replace(/\s+/g, ' ').trim();
            return artist;
        }).filter(artist => artist.length > 0);
        
        return artists.length > 0 ? artists : [artistText];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    classifyByArtist() {
        const artistGroups = {};
        let totalSongs = 0;
        let totalArtists = 0;
        const allArtists = new Set();

        // Şarkıları sanatçıya göre grupla
        this.songs.forEach(song => {
            const artists = song.artists || [song.mainArtist || 'Bilinmeyen Sanatçı'];
            
            // Her sanatçı için ayrı grup oluştur
            artists.forEach(artist => {
                if (!artistGroups[artist]) {
                    artistGroups[artist] = [];
                    totalArtists++;
                }
                
                artistGroups[artist].push({
                    title: song.title,
                    duration: song.duration,
                    videoId: song.videoId,
                    thumbnailUrl: song.thumbnailUrl,
                    timestamp: song.timestamp
                });
                
                allArtists.add(artist);
            });
            
            totalSongs++;
        });

        // Sanatçıları alfabetik sırala
        const sortedArtists = Object.keys(artistGroups).sort((a, b) => {
            // Türkçe karakterleri dikkate alarak sırala
            return a.localeCompare(b, 'tr', { sensitivity: 'base' });
        });

        // Sıralanmış sanatçı gruplarını oluştur
        const sortedArtistGroups = {};
        sortedArtists.forEach(artist => {
            sortedArtistGroups[artist] = artistGroups[artist];
        });

            return {
        byArtist: sortedArtistGroups,
        totalSongs: totalSongs,
        totalArtists: totalArtists,
        artistList: sortedArtists
    };
}

async classifyByGenre() {
    try {
        // Netlify function'a şarkıları gönder
        const response = await fetch('https://yt-music-extension.netlify.app/.netlify/functions/spotify-genre', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songs: this.songs.map(song => ({
                    title: song.title,
                    artist: song.mainArtist || song.artists?.[0] || 'Bilinmeyen Sanatçı'
                }))
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('Invalid response format');
        }

        // Genre'lere göre grupla
        const genreGroups = {};
        let totalGenres = 0;

        data.results.forEach(song => {
            const genre = song.genre || 'Unknown';
            
            if (!genreGroups[genre]) {
                genreGroups[genre] = [];
                totalGenres++;
            }
            
            // Orijinal şarkı bilgilerini bul - yeni array yapısına uygun
            const originalSong = this.songs.find(s => 
                s.title === song.title && 
                (s.mainArtist === song.artist || 
                 (s.artists && s.artists.includes(song.artist)))
            );
            
            if (originalSong) {
                genreGroups[genre].push({
                    title: originalSong.title,
                    artists: originalSong.artists || [originalSong.mainArtist || 'Bilinmeyen Sanatçı'],
                    mainArtist: originalSong.mainArtist || originalSong.artists?.[0] || 'Bilinmeyen Sanatçı',
                    duration: originalSong.duration,
                    videoId: originalSong.videoId,
                    thumbnailUrl: originalSong.thumbnailUrl,
                    timestamp: originalSong.timestamp
                });
            }
        });

        // Genre'leri alfabetik sırala
        const sortedGenres = Object.keys(genreGroups).sort((a, b) => {
            return a.localeCompare(b, 'en', { sensitivity: 'base' });
        });

        // Sıralanmış genre gruplarını oluştur
        const sortedGenreGroups = {};
        sortedGenres.forEach(genre => {
            sortedGenreGroups[genre] = genreGroups[genre];
        });

        return {
            byGenre: sortedGenreGroups,
            totalGenres: totalGenres,
            genreList: sortedGenres
        };

            } catch (error) {
            this.errorLogger.logError(error, 'classifyByGenre', 'error');
            return {
                byGenre: {},
                totalGenres: 0,
                genreList: [],
                error: error.message
            };
        }
}




}

// Content script başlat
new YouTubeMusicScraper(); 
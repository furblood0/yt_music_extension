class YouTubeMusicOrganizer {
    constructor() {
        this.songs = [];
        this.classifications = null;
        this.currentPlaylistUrl = '';
        this.isProcessing = false;
        this.loadingSteps = [
            'Sayfa yükleniyor...',
            'Oynatma listesi analiz ediliyor...',
            'Şarkılar taranıyor...',
            'Veriler işleniyor...',
            'Tamamlanıyor...'
        ];
        this.currentStep = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkCurrentTab();
    }

    bindEvents() {
        document.getElementById('fetchSongs').addEventListener('click', () => {
            this.fetchSongs();
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        // Geri bildirim butonu
        document.getElementById('showFeedbackForm').addEventListener('click', () => {
            this.showFeedbackModal();
        });

        // Modal butonları
        document.getElementById('closeFeedbackModal').addEventListener('click', () => {
            this.hideFeedbackModal();
        });

        document.getElementById('cancelFeedback').addEventListener('click', () => {
            this.hideFeedbackModal();
        });

        document.getElementById('saveFeedback').addEventListener('click', () => {
            this.saveFeedbackData();
        });

        // URL input değişikliğini dinle
        document.getElementById('playlistUrl').addEventListener('input', (e) => {
            this.currentPlaylistUrl = e.target.value;
            this.validateUrl();
        });

        // Butonlara mouse tracking ekle
        this.addButtonMouseTracking();

        // Popup kapanmadan önce işlem durumunu kontrol et
        window.addEventListener('beforeunload', (e) => {
            if (this.isProcessing) {
                e.preventDefault();
                e.returnValue = 'Veri çekme işlemi devam ediyor. Çıkmak istediğinizden emin misiniz?';
                return e.returnValue;
            }
        });
    }

    addButtonMouseTracking() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / button.clientWidth) * 100;
                const y = ((e.clientY - rect.top) / button.clientHeight) * 100;
                
                button.style.setProperty('--mouse-x', `${x}%`);
                button.style.setProperty('--mouse-y', `${y}%`);
            });
        });
    }

    async checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('music.youtube.com')) {
                this.showStatus('YouTube Music sayfasında olmalısınız', 'error');
                document.getElementById('fetchSongs').disabled = true;
            } else {
                this.showStatus('YouTube Music sayfasındasınız. Oynatma listesi seçin veya URL girin.');
                this.currentPlaylistUrl = tab.url;
                document.getElementById('playlistUrl').value = tab.url;
            }
        } catch (error) {
            console.error('Tab kontrolü hatası:', error);
        }
    }

    validateUrl() {
        const url = this.currentPlaylistUrl;
        const fetchBtn = document.getElementById('fetchSongs');
        
        if (url && url.includes('music.youtube.com') && (url.includes('playlist') || url.includes('watch'))) {
            fetchBtn.disabled = false;
            this.showStatus('Geçerli YouTube Music URL\'si.');
        } else if (url) {
            fetchBtn.disabled = true;
            this.showStatus('Geçersiz URL formatı. YouTube Music oynatma listesi URL\'si olmalı.', 'error');
        } else {
            fetchBtn.disabled = true;
            this.showStatus('Lütfen bir oynatma listesi URL\'si girin.');
        }
    }

    async fetchSongs() {
        if (!this.currentPlaylistUrl) {
            this.showStatus('Lütfen önce bir oynatma listesi URL\'si girin.', 'error');
            return;
        }

        this.isProcessing = true;
        this.currentStep = 0;
        this.showLoading(true);
        this.updateLoadingProgress(0);
        this.updateLoadingText(this.loadingSteps[0]);
        this.updateLoadingDetails('Başlatılıyor...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // URL'leri karşılaştır
            const currentUrl = tab.url;
            const targetUrl = this.currentPlaylistUrl;
            
            // Eğer URL'ler farklıysa ve hedef URL geçerliyse, o sayfaya git
            if (currentUrl !== targetUrl && targetUrl.includes('music.youtube.com')) {
                this.updateLoadingProgress(20);
                this.updateLoadingText(this.loadingSteps[1]);
                this.updateLoadingDetails('Hedef sayfaya yönlendiriliyor...');
                
                await chrome.tabs.update(tab.id, { url: targetUrl });
                
                // Sayfanın yüklenmesini bekle
                this.updateLoadingProgress(40);
                this.updateLoadingText(this.loadingSteps[2]);
                this.updateLoadingDetails('Sayfa yükleniyor, lütfen bekleyin...');
                
                await this.sleep(3000);
            }
            
            this.updateLoadingProgress(60);
            this.updateLoadingText(this.loadingSteps[3]);
            this.updateLoadingDetails('Şarkılar taranıyor...');
            
            // Content script'e mesaj gönder
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'fetchPlaylistSongs',
                playlistUrl: this.currentPlaylistUrl
            });

            this.updateLoadingProgress(80);
            this.updateLoadingText(this.loadingSteps[4]);
            this.updateLoadingDetails('Veriler işleniyor...');

            if (response.success) {
                this.songs = response.songs;
                this.classifications = response.classifications || null;
                this.updateLoadingProgress(100);
                this.updateLoadingDetails('Tamamlandı!');
                
                // Kısa bir bekleme sonrası sonuçları göster
                await this.sleep(500);
                
                this.showResults();
                this.showStatus(`${this.songs.length} şarkı başarıyla getirildi!`, 'success');
            } else {
                this.showStatus('Şarkılar getirilemedi: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Şarkı getirme hatası:', error);
            this.showStatus('Bir hata oluştu. Sayfayı yenileyip tekrar deneyin.', 'error');
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    showResults() {
        const stats = document.getElementById('stats');
        const exportBtn = document.getElementById('exportData');

        // Basit istatistikleri göster
        document.getElementById('totalSongs').textContent = this.songs.length;
        document.getElementById('totalArtists').textContent = this.getUniqueArtistsCount();
        
        stats.classList.remove('hidden');
        exportBtn.disabled = false;
        
        // Öğrenme bölümünü göster
        this.showLearningSection();
        
        // Öğrenme istatistiklerini güncelle
        if (this.classifications && this.classifications.learningStats) {
            this.updateLearningStats(this.classifications.learningStats);
        }
        
        // Stats animasyonu ekle
        this.animateStats();
    }

    animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach((stat, index) => {
            setTimeout(() => {
                stat.classList.add('pulse');
                setTimeout(() => stat.classList.remove('pulse'), 1000);
            }, index * 200);
        });
    }

    getUniqueArtistsCount() {
        const artists = new Set();
        this.songs.forEach(song => {
            if (song.artist && song.artist !== 'Bilinmeyen Sanatçı') {
                artists.add(song.artist);
            }
        });
        return artists.size;
    }

    exportData() {
        const data = {
            playlistUrl: this.currentPlaylistUrl,
            totalSongs: this.songs.length,
            totalArtists: this.getUniqueArtistsCount(),
            songs: this.songs,
            classifications: this.classifications || null,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube-music-playlist-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showStatus('Veriler başarıyla JSON formatında dışa aktarıldı!', 'success');
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const fetchBtn = document.getElementById('fetchSongs');
        
        if (show) {
            loading.classList.remove('hidden');
            loading.classList.add('fade-in');
            fetchBtn.disabled = true;
        } else {
            loading.classList.add('hidden');
            loading.classList.remove('fade-in');
            fetchBtn.disabled = false;
        }
    }

    updateLoadingText(message) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    updateLoadingDetails(message) {
        const loadingDetails = document.getElementById('loadingDetails');
        if (loadingDetails) {
            loadingDetails.textContent = message;
        }
    }

    updateLoadingProgress(percentage) {
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        
        // Mesajı doğrudan göster
        status.textContent = message;
        status.className = `status-text ${type}`;
        status.style.display = 'flex';
        
        // Başarı mesajlarını 3 saniye sonra temizle
        if (type === 'success') {
            setTimeout(() => {
                // Status'ı yumuşak bir şekilde kapat
                status.style.transition = 'all 0.3s ease';
                status.style.transform = 'scaleY(0)';
                status.style.opacity = '0';
                status.style.minHeight = '0';
                status.style.margin = '0';
                status.style.padding = '0';
                
                setTimeout(() => {
                    status.textContent = '';
                    status.className = 'status-text';
                    status.style.display = 'none';
                    status.style.transition = '';
                    status.style.transform = '';
                    status.style.opacity = '';
                    status.style.minHeight = '';
                    status.style.margin = '';
                    status.style.padding = '';
                }, 300);
            }, 3000);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 🧠 Öğrenme Sistemi Metodları
    showFeedbackModal() {
        if (!this.songs || this.songs.length === 0) {
            this.showStatus('Önce şarkıları çekmelisiniz!', 'error');
            return;
        }

        if (!this.classifications || !this.classifications.byLanguage) {
            this.showStatus('Dil sınıflandırması henüz yapılmamış!', 'error');
            return;
        }

        this.populateFeedbackModal();
        document.getElementById('feedbackModal').classList.remove('hidden');
    }

    hideFeedbackModal() {
        document.getElementById('feedbackModal').classList.add('hidden');
    }

    populateFeedbackModal() {
        const songListContainer = document.getElementById('feedbackSongList');
        songListContainer.innerHTML = '';

        // Tüm şarkıları birleştir
        const allSongs = [
            ...(this.classifications.byLanguage.Turkish || []),
            ...(this.classifications.byLanguage.Other || [])
        ];

        allSongs.forEach((song, index) => {
            const currentLanguage = this.classifications.byLanguage.Turkish?.some(s => s.title === song.title && s.artist === song.artist) ? 'Turkish' : 'Other';
            
            const songItem = document.createElement('div');
            songItem.className = 'feedback-song-item';
            songItem.innerHTML = `
                <div class="song-title">${song.title}</div>
                <div class="language-options">
                    <div class="language-option">
                        <input type="radio" id="turkish_${index}" name="language_${index}" value="Turkish" ${currentLanguage === 'Turkish' ? 'checked' : ''}>
                        <label for="turkish_${index}">🇹🇷 Türkçe</label>
                    </div>
                    <div class="language-option">
                        <input type="radio" id="other_${index}" name="language_${index}" value="Other" ${currentLanguage === 'Other' ? 'checked' : ''}>
                        <label for="other_${index}">🌍 Diğer</label>
                    </div>
                </div>
            `;
            
            songListContainer.appendChild(songItem);
        });
    }

    async saveFeedbackData() {
        try {
            const songItems = document.querySelectorAll('.feedback-song-item');
            const feedbackData = [];

            songItems.forEach((item, index) => {
                const title = item.querySelector('.song-title').textContent;
                const selectedLanguage = item.querySelector(`input[name="language_${index}"]:checked`).value;
                
                // Sanatçı bilgisini classifications'dan bul
                const songInfo = this.findSongInfo(title);
                if (!songInfo) return; // Şarkı bulunamadıysa atla
                
                // Sadece değişen şarkıları ekle
                const currentLanguage = this.classifications.byLanguage.Turkish?.some(s => s.title === title && s.artist === songInfo.artist) ? 'Turkish' : 'Other';
                
                if (selectedLanguage !== currentLanguage) {
                    feedbackData.push({
                        song: { title, artist: songInfo.artist },
                        correctClassification: selectedLanguage,
                        userClassification: currentLanguage
                    });
                }
            });

            if (feedbackData.length === 0) {
                this.showStatus('Hiçbir değişiklik yapılmadı!', 'info');
                this.hideFeedbackModal();
                return;
            }

            // Her feedback'i gönder
            for (const feedback of feedbackData) {
                await this.submitFeedback(feedback);
            }

            this.showStatus(`${feedbackData.length} düzeltme kaydedildi! Sistem öğrendi. 🧠`, 'success');
            this.hideFeedbackModal();
            
            // İstatistikleri güncelle
            this.updateLearningStatsFromResponse();
            
        } catch (error) {
            console.error('Feedback kaydetme hatası:', error);
            this.showStatus('Düzeltmeler kaydedilemedi.', 'error');
        }
    }

    async submitFeedback(feedback) {
        try {
            const response = await fetch('https://yt-music-extension.netlify.app/.netlify/functions/smart-language-learner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'feedback',
                    data: feedback
                })
            });

            if (!response.ok) {
                throw new Error('Feedback gönderilemedi');
            }

            return await response.json();
        } catch (error) {
            console.error('Feedback hatası:', error);
            throw error;
        }
    }

    async updateLearningStatsFromResponse() {
        try {
            const response = await fetch('https://yt-music-extension.netlify.app/.netlify/functions/smart-language-learner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getStats'
                })
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateLearningStats(stats);
            }
        } catch (error) {
            console.error('İstatistik güncelleme hatası:', error);
        }
    }

    async viewLearningStats() {
        try {
            const response = await fetch('https://yt-music-extension.netlify.app/.netlify/functions/smart-language-learner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getStats'
                })
            });

            if (response.ok) {
                const stats = await response.json();
                this.showLearningStatsModal(stats);
            } else {
                throw new Error('İstatistikler alınamadı');
            }
        } catch (error) {
            console.error('İstatistik hatası:', error);
            this.showStatus('Öğrenme istatistikleri alınamadı.', 'error');
        }
    }

    showLearningStatsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'learning-stats-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🧠 Öğrenme İstatistikleri</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Toplam Düzeltme</span>
                        <span class="stat-value">${stats.totalCorrections}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Öğrenilen Kelime</span>
                        <span class="stat-value">${stats.learnedWords.turkish.length + stats.learnedWords.foreign.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Öğrenilen Sanatçı</span>
                        <span class="stat-value">${stats.learnedArtists.turkish.length + stats.learnedArtists.foreign.length}</span>
                    </div>
                </div>
                <div class="weights-section">
                    <h4>📊 Dinamik Ağırlıklar</h4>
                    <div class="weight-item">
                        <span>Karakter:</span> <span>${stats.weights.character}</span>
                    </div>
                    <div class="weight-item">
                        <span>Kelime:</span> <span>${stats.weights.word}</span>
                    </div>
                    <div class="weight-item">
                        <span>Sanatçı:</span> <span>${stats.weights.artist}</span>
                    </div>
                    <div class="weight-item">
                        <span>Pattern:</span> <span>${stats.weights.pattern}</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">Kapat</button>
            </div>
        `;

        // Modal stillerini ekle
        const style = document.createElement('style');
        style.textContent = `
            .learning-stats-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin: 20px 0;
            }
            .weights-section {
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
            }
            .weight-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #dee2e6;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(modal);
    }

    updateLearningStats(stats) {
        // Öğrenme istatistiklerini güncelle
        document.getElementById('totalCorrections').textContent = stats.totalCorrections || 0;
        document.getElementById('learnedWords').textContent = stats.learnedWords || 0;
        document.getElementById('learnedArtists').textContent = stats.learnedArtists || 0;
        
        // Son güncelleme zamanını göster
        if (stats.lastUpdated) {
            const lastUpdated = new Date(stats.lastUpdated);
            const now = new Date();
            const diffInMinutes = Math.floor((now - lastUpdated) / (1000 * 60));
            
            let timeText;
            if (diffInMinutes < 1) {
                timeText = 'Az önce';
            } else if (diffInMinutes < 60) {
                timeText = `${diffInMinutes} dk önce`;
            } else if (diffInMinutes < 1440) {
                const hours = Math.floor(diffInMinutes / 60);
                timeText = `${hours} saat önce`;
            } else {
                const days = Math.floor(diffInMinutes / 1440);
                timeText = `${days} gün önce`;
            }
            
            document.getElementById('lastUpdated').textContent = timeText;
        } else {
            document.getElementById('lastUpdated').textContent = '-';
        }
    }

    showLearningSection() {
        // Geri bildirim bölümünü göster
        document.getElementById('learningSection').classList.remove('hidden');
    }

    // Şarkı bilgisini classifications'dan bul
    findSongInfo(title) {
        // Önce Turkish listesinde ara
        const turkishSong = this.classifications.byLanguage.Turkish?.find(s => s.title === title);
        if (turkishSong) return turkishSong;
        
        // Sonra Other listesinde ara
        const otherSong = this.classifications.byLanguage.Other?.find(s => s.title === title);
        if (otherSong) return otherSong;
        
        return null; // Şarkı bulunamadı
    }
}

// Extension yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeMusicOrganizer();
}); 
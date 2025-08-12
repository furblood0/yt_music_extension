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
}

// Extension yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeMusicOrganizer();
}); 
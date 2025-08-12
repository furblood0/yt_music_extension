// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Music Organizer extension yüklendi!');
});

// Extension icon'a tıklandığında popup'ı aç
chrome.action.onClicked.addListener((tab) => {
    // Popup otomatik olarak açılacak (manifest.json'da tanımlı)
});

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabInfo') {
        // Tab bilgilerini döndür
        sendResponse({
            url: sender.tab.url,
            title: sender.tab.title
        });
    }
}); 
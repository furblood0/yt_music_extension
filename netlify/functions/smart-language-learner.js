// Smart Language Learning System
// Bu sistem kullanıcı geri bildirimlerinden öğrenir ve sürekli iyileşir

const fs = require('fs');
const path = require('path');

// JSON dosya yolu
const DATA_FILE_PATH = path.join(__dirname, 'learning-data.json');

// Varsayılan öğrenme verileri
const defaultLearningData = {
  // Kullanıcı düzeltmeleri
  corrections: [],
  // Öğrenilen kelimeler
  learnedWords: {
    turkish: [],
    foreign: []
  },
  // Öğrenilen sanatçılar
  learnedArtists: {
    turkish: [],
    foreign: []
  },
  // Pattern'lar
  patterns: {
    turkish: [],
    foreign: []
  },
  // Puanlama ağırlıkları (öğrenme ile değişir)
  weights: {
    character: 10,
    word: 50,
    artist: 50,
    length: 10,
    pattern: 30
  },
  // Güven eşikleri (öğrenme ile değişir)
  thresholds: {
    high: 100,
    medium: 60,
    low: 30,
    turkish: 50
  },
  // Son güncelleme zamanı
  lastUpdated: new Date().toISOString()
};

// JSON dosyasından veri yükle
function loadLearningData() {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      const loadedData = JSON.parse(data);
      
      // Set'leri geri yükle
      loadedData.learnedWords.turkish = new Set(loadedData.learnedWords.turkish);
      loadedData.learnedWords.foreign = new Set(loadedData.learnedWords.foreign);
      loadedData.learnedArtists.turkish = new Set(loadedData.learnedArtists.turkish);
      loadedData.learnedArtists.foreign = new Set(loadedData.learnedArtists.foreign);
      loadedData.patterns.turkish = new Set(loadedData.patterns.turkish);
      loadedData.patterns.foreign = new Set(loadedData.patterns.foreign);
      
      return loadedData;
    }
  } catch (error) {
    console.error('Öğrenme verisi yüklenirken hata:', error);
  }
  
  // Dosya yoksa veya hata varsa varsayılan veriyi döndür
  return JSON.parse(JSON.stringify(defaultLearningData));
}

// JSON dosyasına veri kaydet
function saveLearningData(data) {
  try {
    // Set'leri array'e çevir
    const dataToSave = {
      ...data,
      learnedWords: {
        turkish: Array.from(data.learnedWords.turkish),
        foreign: Array.from(data.learnedWords.foreign)
      },
      learnedArtists: {
        turkish: Array.from(data.learnedArtists.turkish),
        foreign: Array.from(data.learnedArtists.foreign)
      },
      patterns: {
        turkish: Array.from(data.patterns.turkish),
        foreign: Array.from(data.patterns.foreign)
      },
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(dataToSave, null, 2));
    console.log('Öğrenme verisi kaydedildi:', DATA_FILE_PATH);
  } catch (error) {
    console.error('Öğrenme verisi kaydedilirken hata:', error);
  }
}

// Öğrenme verilerini yükle
let learningData = loadLearningData();

// Ana handler fonksiyonu
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    const { action, data } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'detect':
        return await handleLanguageDetection(data, headers);
      case 'learn':
        return await handleLearning(data, headers);
      case 'feedback':
        return await handleUserFeedback(data, headers);
      case 'getStats':
        return await getLearningStats(headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Smart Language Learner Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Dil tespiti yap
async function handleLanguageDetection(data, headers) {
  const { songs } = data;
  
  if (!songs || !Array.isArray(songs)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Songs array is required' })
    };
  }

  const results = [];
  
  for (const song of songs) {
    try {
      const languageResult = smartLanguageDetection(song.title, song.artist);
      results.push({
        title: song.title,
        artist: song.artist,
        language: languageResult.language,
        isTurkish: languageResult.language === 'tr',
        confidence: languageResult.confidence,
        turkishScore: languageResult.turkishScore,
        method: languageResult.method,
        patterns: languageResult.patterns
      });
    } catch (error) {
      console.error(`Error detecting language for "${song.title}":`, error);
      const fallbackResult = basicLanguageDetection(song.title, song.artist);
      results.push({
        title: song.title,
        artist: song.artist,
        language: fallbackResult.language,
        isTurkish: fallbackResult.language === 'tr',
        confidence: 'low',
        turkishScore: fallbackResult.turkishScore,
        method: 'fallback',
        patterns: []
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      results,
      learningStats: {
        totalCorrections: learningData.corrections.length,
        learnedWords: learningData.learnedWords.turkish.size + learningData.learnedWords.foreign.size,
        learnedArtists: learningData.learnedArtists.turkish.size + learningData.learnedArtists.foreign.size
      }
    })
  };
}

// Kullanıcı geri bildirimini işle ve öğren
async function handleUserFeedback(data, headers) {
  const { song, correctClassification, userClassification } = data;
  
  if (!song || correctClassification === undefined) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required feedback data' })
    };
  }

  // Düzeltmeyi kaydet
  const correction = {
    song,
    correctClassification,
    userClassification,
    timestamp: new Date().toISOString(),
    patterns: extractPatterns(song.title, song.artist)
  };

  learningData.corrections.push(correction);

  // Öğrenme algoritmasını çalıştır
  await learnFromCorrection(correction);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Feedback received and learning applied',
      learningStats: {
        totalCorrections: learningData.corrections.length,
        learnedWords: learningData.learnedWords.turkish.size + learningData.learnedWords.foreign.size,
        learnedArtists: learningData.learnedArtists.turkish.size + learningData.learnedArtists.foreign.size
      }
    })
  };
}

// Öğrenme algoritması
async function learnFromCorrection(correction) {
  const { song, correctClassification, patterns } = correction;
  const isTurkish = correctClassification === 'Turkish';

  // Kelime öğrenme
  const words = extractWords(song.title + ' ' + song.artist);
  words.forEach(word => {
    if (isTurkish) {
      learningData.learnedWords.turkish.add(word.toLowerCase());
    } else {
      learningData.learnedWords.foreign.add(word.toLowerCase());
    }
  });

  // Sanatçı öğrenme
  if (song.artist) {
    if (isTurkish) {
      learningData.learnedArtists.turkish.add(song.artist.toLowerCase());
    } else {
      learningData.learnedArtists.foreign.add(song.artist.toLowerCase());
    }
  }

  // Pattern öğrenme
  patterns.forEach(pattern => {
    if (isTurkish) {
      learningData.patterns.turkish.add(pattern);
    } else {
      learningData.patterns.foreign.add(pattern);
    }
  });

  // Ağırlıkları dinamik olarak ayarla
  adjustWeights(correction);

  // Eşikleri dinamik olarak ayarla
  adjustThresholds();

  // Değişiklikleri JSON dosyasına kaydet
  saveLearningData(learningData);
}

// Akıllı dil tespiti
function smartLanguageDetection(title, artist) {
  const patterns = extractPatterns(title, artist);
  let turkishScore = 0;
  const usedPatterns = [];

  // Karakter analizi
  const turkishChars = countTurkishCharacters(title + ' ' + artist);
  turkishScore += turkishChars * learningData.weights.character;
  if (turkishChars > 0) usedPatterns.push(`turkish_chars:${turkishChars}`);

  // Kelime analizi
  const words = extractWords(title + ' ' + artist);
  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    
    // Öğrenilen kelimeler
    if (learningData.learnedWords.turkish.has(lowerWord)) {
      turkishScore += learningData.weights.word;
      usedPatterns.push(`learned_turkish_word:${word}`);
    } else if (learningData.learnedWords.foreign.has(lowerWord)) {
      turkishScore -= learningData.weights.word;
      usedPatterns.push(`learned_foreign_word:${word}`);
    }
    
    // Temel Türkçe kelimeler
    if (basicTurkishWords.has(lowerWord)) {
      turkishScore += learningData.weights.word;
      usedPatterns.push(`basic_turkish_word:${word}`);
    }
  });

  // Sanatçı analizi
  if (artist) {
    const lowerArtist = artist.toLowerCase();
    
    if (learningData.learnedArtists.turkish.has(lowerArtist)) {
      turkishScore += learningData.weights.artist;
      usedPatterns.push(`learned_turkish_artist:${artist}`);
    } else if (learningData.learnedArtists.foreign.has(lowerArtist)) {
      turkishScore -= learningData.weights.artist;
      usedPatterns.push(`learned_foreign_artist:${artist}`);
    }
  }

  // Pattern analizi
  patterns.forEach(pattern => {
    if (learningData.patterns.turkish.has(pattern)) {
      turkishScore += learningData.weights.pattern;
      usedPatterns.push(`learned_turkish_pattern:${pattern}`);
    } else if (learningData.patterns.foreign.has(pattern)) {
      turkishScore -= learningData.weights.pattern;
      usedPatterns.push(`learned_foreign_pattern:${pattern}`);
    }
  });

  // Uzunluk bonusu
  if (title.length > 10 && turkishScore > 20) {
    turkishScore += learningData.weights.length;
    usedPatterns.push(`length_bonus:${title.length}`);
  }

  // Güven seviyesi belirleme
  let confidence = 'low';
  if (turkishScore >= learningData.thresholds.high) {
    confidence = 'high';
  } else if (turkishScore >= learningData.thresholds.medium) {
    confidence = 'medium';
  }

  // Dil belirleme
  const language = turkishScore >= learningData.thresholds.turkish ? 'tr' : 'en';

  return {
    language,
    confidence,
    turkishScore,
    method: 'smart_learning',
    patterns: usedPatterns
  };
}

// Temel dil tespiti (fallback)
function basicLanguageDetection(title, artist) {
  const turkishChars = countTurkishCharacters(title + ' ' + artist);
  const turkishScore = turkishChars * 5;
  
  return {
    language: turkishScore > 10 ? 'tr' : 'en',
    turkishScore
  };
}

// Yardımcı fonksiyonlar
function extractPatterns(title, artist) {
  const text = (title + ' ' + artist).toLowerCase();
  const patterns = [];
  
  // Kelime uzunluğu pattern'ları
  const words = text.split(/\s+/);
  patterns.push(`word_count:${words.length}`);
  patterns.push(`avg_word_length:${Math.round(words.reduce((sum, w) => sum + w.length, 0) / words.length)}`);
  
  // Karakter pattern'ları
  patterns.push(`total_length:${text.length}`);
  patterns.push(`turkish_char_ratio:${(countTurkishCharacters(text) / text.length).toFixed(2)}`);
  
  return patterns;
}

function extractWords(text) {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

function countTurkishCharacters(text) {
  const turkishChars = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'Ç', 'Ğ', 'I', 'Ö', 'Ş', 'Ü'];
  return turkishChars.reduce((count, char) => count + (text.match(new RegExp(char, 'g')) || []).length, 0);
}

function adjustWeights(correction) {
  // Yanlış sınıflandırma durumunda ağırlıkları ayarla
  const wasCorrect = correction.correctClassification === correction.userClassification;
  
  if (!wasCorrect) {
    // Yanlış sınıflandırma durumunda ağırlıkları artır
    learningData.weights.word += 2;
    learningData.weights.artist += 2;
    learningData.weights.pattern += 1;
  }
}

function adjustThresholds() {
  // Son 10 düzeltmeye göre eşikleri ayarla
  const recentCorrections = learningData.corrections.slice(-10);
  const accuracy = recentCorrections.filter(c => 
    c.correctClassification === c.userClassification
  ).length / recentCorrections.length;
  
  if (accuracy < 0.7) {
    // Düşük doğruluk - eşikleri sıkılaştır
    learningData.thresholds.turkish += 5;
    learningData.thresholds.high += 10;
  } else if (accuracy > 0.9) {
    // Yüksek doğruluk - eşikleri gevşet
    learningData.thresholds.turkish = Math.max(30, learningData.thresholds.turkish - 2);
    learningData.thresholds.high = Math.max(80, learningData.thresholds.high - 5);
  }
}

// Temel Türkçe kelimeler
const basicTurkishWords = new Set([
  'aşk', 'güzel', 'kalp', 'hayat', 'dünya', 'sevgi', 'mutlu', 'hüzün',
  'göz', 'yüz', 'el', 'ay', 'güneş', 'yıldız', 'deniz', 'dağ', 'orman',
  'çiçek', 'kuş', 'bebek', 'anne', 'baba', 'kardeş', 'arkadaş', 'okul',
  'ev', 'yol', 'araba', 'kitap', 'müzik', 'şarkı', 'dans', 'oyun'
]);

// Öğrenme istatistiklerini getir
async function getLearningStats(headers) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      totalCorrections: learningData.corrections.length,
      learnedWords: {
        turkish: Array.from(learningData.learnedWords.turkish),
        foreign: Array.from(learningData.learnedWords.foreign)
      },
      learnedArtists: {
        turkish: Array.from(learningData.learnedArtists.turkish),
        foreign: Array.from(learningData.learnedArtists.foreign)
      },
      patterns: {
        turkish: Array.from(learningData.patterns.turkish),
        foreign: Array.from(learningData.patterns.foreign)
      },
      weights: learningData.weights,
      thresholds: learningData.thresholds,
      lastUpdated: learningData.lastUpdated
    })
  };
}

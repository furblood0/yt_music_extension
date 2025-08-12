const https = require('https');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Check if it's a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No request body provided' })
      };
    }

    const { songs } = JSON.parse(event.body);
    
    if (!songs || !Array.isArray(songs)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Songs array is required' })
      };
    }

    // Get Yandex Translate API key from environment variables
    const apiKey = process.env.YANDEX_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Yandex Translate API key not configured' })
      };
    }

    // Process each song to detect language
    const results = [];
    
    for (const song of songs) {
      try {
        const language = await detectLanguage(song.title, apiKey);
        results.push({
          title: song.title,
          artist: song.artist,
          language: language,
          isTurkish: language === 'tr'
        });
      } catch (error) {
        console.error(`Error detecting language for "${song.title}":`, error);
        // Default to 'Other' if detection fails
        results.push({
          title: song.title,
          artist: song.artist,
          language: 'unknown',
          isTurkish: false
        });
      }
    }

    // Group songs by language
    const byLanguage = {
      Turkish: [],
      Other: []
    };

    results.forEach(result => {
      if (result.isTurkish) {
        byLanguage.Turkish.push({
          title: result.title,
          artist: result.artist
        });
      } else {
        byLanguage.Other.push({
          title: result.title,
          artist: result.artist
        });
      }
    });

    // Calculate statistics
    const totalSongs = results.length;
    const totalTurkish = byLanguage.Turkish.length;
    const totalOther = byLanguage.Other.length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        byLanguage: byLanguage,
        totalSongs,
        totalTurkish,
        totalOther
      })
    };

  } catch (error) {
    console.error('Error in yandex-translate function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

// Function to detect language using Yandex Translate API
async function detectLanguage(text, apiKey) {
  return new Promise((resolve, reject) => {
    // First, try to detect the language
    const detectData = JSON.stringify({
      text: text
    });

    const options = {
      hostname: 'translate.yandex.net',
      port: 443,
      path: '/api/v1.5/tr.json/detect',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Length': Buffer.byteLength(detectData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.code === 200 && response.lang) {
            // Check if detected language is Turkish
            if (response.lang === 'tr') {
              resolve('tr');
            } else {
              resolve('en'); // Default to English for non-Turkish
            }
          } else {
            // If detection fails, try fallback method
            detectLanguageFallback(text, apiKey)
              .then(resolve)
              .catch(reject);
          }
        } catch (error) {
          // If parsing fails, try fallback method
          detectLanguageFallback(text, apiKey)
            .then(resolve)
            .catch(reject);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Fallback method to detect language
async function detectLanguageFallback(text, apiKey) {
  return new Promise((resolve, reject) => {
    // Try to detect language using Yandex Translate API with different approach
    const options = {
      hostname: 'translate.yandex.net',
      port: 443,
      path: '/api/v1.5/tr.json/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'Content-Length': Buffer.byteLength(JSON.stringify({ 
          text: text,
          lang: 'tr' // Try to translate to Turkish
        }))
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.code === 200) {
            // If translation to Turkish is successful, it's likely Turkish
            resolve('tr');
          } else {
            // Default to English if translation fails
            resolve('en');
          }
        } catch (error) {
          // Default to English if parsing fails
          resolve('en');
        }
      });
    });

    req.on('error', (error) => {
      // Default to English if request fails
      resolve('en');
    });

    req.write(JSON.stringify({ text: text }));
    req.end();
  });
}

// netlify/functions/spotify-genre.js
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

exports.handler = async (event) => {
  try {
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

    // Check if body exists and parse it safely
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Parse request body safely
    let songs;
    try {
      const body = JSON.parse(event.body);
      songs = body.songs;
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    if (!songs || !Array.isArray(songs)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Songs array is required' })
      };
    }

    // Get Spotify access token
    const token = await getSpotifyAccessToken();
    
    // Process each song
    const results = [];
    for (const song of songs) {
      const genre = await searchSpotifyTrack(song.title, song.artist, token);
      results.push({
        title: song.title,
        artist: song.artist,
        genre: genre || 'Unknown'
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getSpotifyAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

async function searchSpotifyTrack(title, artist, token) {
  const query = `${title} ${artist}`;
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  
  if (data.tracks && data.tracks.items.length > 0) {
    const track = data.tracks.items[0];
    // Get artist genres
    if (track.artists && track.artists.length > 0) {
      const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const artistData = await artistResponse.json();
      return artistData.genres && artistData.genres.length > 0 ? artistData.genres[0] : 'Unknown';
    }
  }
  
  return 'Unknown';
}
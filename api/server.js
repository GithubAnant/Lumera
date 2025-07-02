// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const axios = require('axios');
// require('dotenv').config({ path: './apikeys.env' });

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Serve static files with proper MIME types
// app.use(express.static(__dirname, {
//   setHeaders: (res, path) => {
//     if (path.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     }
//     if (path.endsWith('.js')) {
//       res.setHeader('Content-Type', 'application/javascript');
//     }
//   }
// }));

// // Store access token and track metadata
// let spotifyAccessToken = null;
// let tokenExpiryTime = null;
// let trackMetadataCache = new Map(); // Store metadata for future use

// // Get track audio features (mood metadata)
// async function getTrackMood(trackId, accessToken) {
//   try {
//     const response = await axios.get(
//       `https://api.spotify.com/v1/audio-features/${trackId}`,
//       {
//         headers: {
//           'Authorization': `Bearer ${accessToken}`
//         }
//       }
//     );
    
//     const data = response.data;
//     const audioFeatures = {
//       valence: data.valence,
//       energy: data.energy,
//       danceability: data.danceability,
//       tempo: data.tempo,
//       acousticness: data.acousticness,
//       instrumentalness: data.instrumentalness,
//       liveness: data.liveness,
//       loudness: data.loudness,
//       speechiness: data.speechiness
//     };
    
//     // Store metadata in cache for future use
//     trackMetadataCache.set(trackId, audioFeatures);
    
//     // Console log the metadata
//     console.log(`Audio features for track ${trackId}:`, audioFeatures);
    
//     return audioFeatures;
//   } catch (error) {
//     console.error(`Error fetching audio features for track ${trackId}:`, error.message);
//     return null;
//   }
// }

// // Function to get Spotify access token (this was missing the function declaration)
// async function getSpotifyAccessToken() {
//   if (spotifyAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
//     return spotifyAccessToken;
//   }

//   const clientId = process.env.SPOTIFY_CLIENT_ID;
//   const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
//   try {
//     const response = await axios.post('https://accounts.spotify.com/api/token', 
//       'grant_type=client_credentials',
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
//         }
//       }
//     );

//     const data = response.data;
//     spotifyAccessToken = data.access_token;
//     tokenExpiryTime = Date.now() + (data.expires_in * 1000);
    
//     return spotifyAccessToken;
//   } catch (error) {
//     console.error('Error getting Spotify access token:', error.message);
//     throw error;
//   }
// }

// // Search endpoint with audio features
// app.get('/api/search', async (req, res) => {
//   try {
//     const { q } = req.query;
    
//     if (!q || q.trim().length === 0) {
//       return res.json({ tracks: [] });
//     }

//     const accessToken = await getSpotifyAccessToken();
    
//     const searchResponse = await axios.get(
//       `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
//       {
//         headers: {
//           'Authorization': `Bearer ${accessToken}`
//         }
//       }
//     );

//     const searchData = searchResponse.data;
    
//     if (searchData.tracks && searchData.tracks.items) {
//       // Get basic track info first
//       const tracks = searchData.tracks.items.map(track => ({
//         id: track.id,
//         name: track.name,
//         artists: track.artists.map(artist => artist.name).join(', '),
//         album: track.album.name,
//         image: track.album.images[0]?.url || null,
//         preview_url: track.preview_url,
//         external_url: track.external_urls.spotify,
//         audioFeatures: null // Will be populated below
//       }));
      
//       // Fetch audio features for all tracks (in parallel for better performance)
//       const audioFeaturesPromises = tracks.map(track => 
//         getTrackMood(track.id, accessToken)
//       );
      
//       const audioFeaturesResults = await Promise.all(audioFeaturesPromises);
      
//       // Add audio features to each track
//       tracks.forEach((track, index) => {
//         track.audioFeatures = audioFeaturesResults[index];
//       });
      
//       // Log the total number of tracks with metadata cached
//       console.log(`Total tracks with cached metadata: ${trackMetadataCache.size}`);
      
//       res.json({ tracks });
//     } else {
//       res.json({ tracks: [] });
//     }
    
//   } catch (error) {
//     console.error('Search error:', error.message);
//     res.status(500).json({ error: 'Search failed', details: error.message });
//   }
// });

// // New endpoint to get audio features for a specific track
// app.get('/api/track/:trackId/features', async (req, res) => {
//   try {
//     const { trackId } = req.params;
    
//     // Check if we have cached metadata first
//     if (trackMetadataCache.has(trackId)) {
//       console.log(`Using cached metadata for track ${trackId}`);
//       return res.json({ audioFeatures: trackMetadataCache.get(trackId) });
//     }
    
//     const accessToken = await getSpotifyAccessToken();
//     const audioFeatures = await getTrackMood(trackId, accessToken);
    
//     if (audioFeatures) {
//       res.json({ audioFeatures });
//     } else {
//       res.status(404).json({ error: 'Audio features not found' });
//     }
    
//   } catch (error) {
//     console.error('Audio features error:', error.message);
//     res.status(500).json({ error: 'Failed to get audio features', details: error.message });
//   }
// });

// // New endpoint to get all cached metadata
// app.get('/api/metadata/cache', (req, res) => {
//   const cacheData = Object.fromEntries(trackMetadataCache);
//   console.log('Current metadata cache:', cacheData);
//   res.json({ 
//     totalCached: trackMetadataCache.size,
//     metadata: cacheData 
//   });
// });

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'OK', message: 'Server is running' });
// });

// // Serve the main HTML file
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`📁 Serving files from: ${__dirname}`);
// });
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// cache and helper logic stays same...
let spotifyAccessToken = null;
let tokenExpiryTime = null;
let trackMetadataCache = new Map();

async function getSpotifyAccessToken() {
  if (spotifyAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const response = await axios.post('https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      }
    }
  );

  const data = response.data;
  spotifyAccessToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in * 1000);
  return spotifyAccessToken;
}

async function getTrackMood(trackId, accessToken) {
  const response = await axios.get(
    `https://api.spotify.com/v1/audio-features/${trackId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const data = response.data;
  const audioFeatures = {
    valence: data.valence,
    energy: data.energy,
    danceability: data.danceability,
    tempo: data.tempo,
    acousticness: data.acousticness,
    instrumentalness: data.instrumentalness,
    liveness: data.liveness,
    loudness: data.loudness,
    speechiness: data.speechiness
  };

  trackMetadataCache.set(trackId, audioFeatures);
  return audioFeatures;
}

// Routes
app.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) return res.json({ tracks: [] });

  const accessToken = await getSpotifyAccessToken();
  const searchResponse = await axios.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const searchData = searchResponse.data;
  const tracks = searchData.tracks.items.map(track => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map(artist => artist.name).join(', '),
    album: track.album.name,
    image: track.album.images[0]?.url || null,
    preview_url: track.preview_url,
    external_url: track.external_urls.spotify,
    audioFeatures: null
  }));

  const audioFeaturesResults = await Promise.all(
    tracks.map(track => getTrackMood(track.id, accessToken))
  );

  tracks.forEach((track, index) => {
    track.audioFeatures = audioFeaturesResults[index];
  });

  res.json({ tracks });
});

app.get('/track/:trackId/features', async (req, res) => {
  const { trackId } = req.params;

  if (trackMetadataCache.has(trackId)) {
    return res.json({ audioFeatures: trackMetadataCache.get(trackId) });
  }

  const accessToken = await getSpotifyAccessToken();
  const audioFeatures = await getTrackMood(trackId, accessToken);
  if (audioFeatures) res.json({ audioFeatures });
  else res.status(404).json({ error: 'Not found' });
});

app.get('/metadata/cache', (req, res) => {
  res.json({
    totalCached: trackMetadataCache.size,
    metadata: Object.fromEntries(trackMetadataCache)
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ⬇️ This is what Vercel needs
module.exports = serverless(app);

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
// require('dotenv').config({ path: './apikeys.env' });

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Store access token
let spotifyAccessToken = null;
let tokenExpiryTime = null;

// Function to get Spotify access token
async function getSpotifyAccessToken() {
  if (spotifyAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  try {
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
  } catch (error) {
    console.error('Error getting Spotify access token:', error.message);
    throw error;
  }
}

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ tracks: [] });
    }

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
    
    if (searchData.tracks && searchData.tracks.items) {
      const tracks = searchData.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        image: track.album.images[0]?.url || null,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify
      }));
      
      res.json({ tracks });
    } else {
      res.json({ tracks: [] });
    }
    
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
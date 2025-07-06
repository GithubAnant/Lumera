const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");
require('dotenv').config();
// require("dotenv").config({ path: "./apikeys.env" });

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
app.use(
  express.static(__dirname, {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  })
);

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
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    const data = response.data;
    spotifyAccessToken = data.access_token;
    tokenExpiryTime = Date.now() + data.expires_in * 1000;

    return spotifyAccessToken;
  } catch (error) {
    console.error("Error getting Spotify access token:", error.message);
    throw error;
  }
}

// Function to run Python mood matcher
// function runMoodMatcher(mood, selectedSongId = null) {
  
//   return new Promise((resolve, reject) => {
//     const pythonScript = path.join(__dirname, "mood_matcher.py");
//     const args = [pythonScript, mood];
    
//     if (selectedSongId) {
//       args.push(selectedSongId);
//     }
    
//     const python = spawn("python", args);
    
//     let dataString = "";
//     let errorString = "";
    
//     python.on("close", (code) => {
//       console.log("=== PYTHON DEBUG INFO ===");
//       console.log("Exit code:", code);
//       console.log("Raw stdout:", JSON.stringify(dataString));
//       console.log("Raw stderr:", JSON.stringify(errorString));
//       console.log("Stdout length:", dataString.length);
//       console.log("========================");
  
//       if (code !== 0) {
//         reject(
//           new Error(`Python script failed with code ${code}: ${errorString}`)
//         );
//         return;
//       }
  
//       if (!dataString || dataString.trim().length === 0) {
//         reject(new Error("Python script returned empty output"));
//         return;
//       }
  
//       try {
//         const result = JSON.parse(dataString.trim());
//         if (result.error) {
//           reject(new Error(result.error));
//         } else {
//           resolve(result);
//         }
//       } catch (parseError) {
//         reject(
//           new Error(
//             `Failed to parse Python output: ${parseError.message}. Raw output: ${dataString}`
//           )
//         );
//       }
//     });

//     python.stdout.on("data", (data) => {
//       dataString += data.toString();
//     });

//     python.stderr.on("data", (data) => {
//       errorString += data.toString();
//     });

//     python.on("close", (code) => {
//       if (code !== 0) {
//         reject(new Error(`Python script failed: ${errorString}`));
//         return;
//       }

//       try {
//         const result = JSON.parse(dataString);
//         if (result.error) {
//           reject(new Error(result.error));
//         } else {
//           resolve(result);
//         }
//       } catch (parseError) {
//         reject(
//           new Error(`Failed to parse Python output: ${parseError.message}`)
//         );
//       }
//     });
//   });
// }
function runMoodMatcher(mood, selectedSongId = null) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "mood_matcher.py");
    const args = [pythonScript, mood];
    
    if (selectedSongId) {
      args.push(selectedSongId);
    }
    
    // Use python3 instead of python for better compatibility
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const python = spawn(pythonCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',  // Disable Python output buffering
        PYTHONIOENCODING: 'utf-8'  // Ensure proper encoding
      }
    });
    
    let dataString = "";
    let errorString = "";
    
    python.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorString += data.toString();
    });

    python.on("close", (code) => {
      console.log("=== PYTHON DEBUG INFO ===");
      console.log("Exit code:", code);
      console.log("Raw stdout:", JSON.stringify(dataString));
      console.log("Raw stderr:", JSON.stringify(errorString));
      console.log("Stdout length:", dataString.length);
      console.log("========================");

      if (code !== 0) {
        reject(
          new Error(`Python script failed with code ${code}: ${errorString}`)
        );
        return;
      }

      if (!dataString || dataString.trim().length === 0) {
        reject(new Error("Python script returned empty output"));
        return;
      }

      try {
        const result = JSON.parse(dataString.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (parseError) {
        reject(
          new Error(
            `Failed to parse Python output: ${parseError.message}. Raw output: ${dataString}`
          )
        );
      }
    });

    python.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Function to get track details from Spotify
async function getSpotifyTrackDetails(trackIds) {
  try {
    const accessToken = await getSpotifyAccessToken();

    // Spotify API allows up to 50 tracks per request
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      chunks.push(trackIds.slice(i, i + 50));
    }

    const allTracks = [];

    for (const chunk of chunks) {
      const response = await axios.get(
        `https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.tracks) {
        allTracks.push(
          ...response.data.tracks.filter((track) => track !== null)
        );
      }
    }

    return allTracks.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist) => artist.name).join(", "),
      image: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
    }));
  } catch (error) {
    console.error("Error getting Spotify track details:", error.message);
    throw error;
  }
}

// Search endpoint
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ tracks: [] });
    }

    const accessToken = await getSpotifyAccessToken();

    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        q
      )}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = searchResponse.data;

    if (searchData.tracks && searchData.tracks.items) {
      const tracks = searchData.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist) => artist.name).join(", "),
        image: track.album.images[0]?.url || null,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify,
      }));

      res.json({ tracks });
    } else {
      res.json({ tracks: [] });
    }
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed", details: error.message });
  }
});

// Mood-based recommendation endpoint
app.post("/api/recommend", async (req, res) => {
  try {
    const { mood, selectedSongId, limit = 5 } = req.body;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    const validMoods = [
      "Happy",
      "Sad",
      "Energetic",
      "Chill",
      "Romantic",
      "Party",
      "Focus",
      "Angry",
      "Nostalgic",
      "Upbeat",
      "Mellow",
      "Intense",
    ];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ error: "Invalid mood", validMoods });
    }

    console.log(
      `Getting recommendations for mood: ${mood}, selectedSong: ${selectedSongId}`
    );

    // Run Python mood matcher
    const moodResults = await runMoodMatcher(mood, selectedSongId);

    if (!moodResults.matches || moodResults.matches.length === 0) {
      return res.json({
        mood,
        selectedSongId,
        recommendations: [],
        message: "No matching tracks found for this mood",
      });
    }

    // Get track IDs for Spotify API
    const trackIds = moodResults.matches
      .slice(0, limit)
      .map((match) => match.track_id);

    // Get detailed track information from Spotify
    const spotifyTracks = await getSpotifyTrackDetails(trackIds);

    // Combine mood matching data with Spotify data
    const recommendations = moodResults.matches.slice(0, limit).map((match) => {
      const spotifyTrack = spotifyTracks.find(
        (track) => track.id === match.track_id
      );

      return {
        ...match,
        spotify: spotifyTrack || null,
        // Include mood score and features for debugging
        mood_score: match.mood_score,
        features: match.features,
      };
    });

    res.json({
      mood,
      selectedSongId,
      recommendations,
      total_found: moodResults.matches.length,
    });
  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json({
      error: "Failed to get recommendations",
      details: error.message,
    });
  }
});

// Single recommendation endpoint (returns just one song)
app.post("/api/recommend-single", async (req, res) => {
  try {
    const { mood, selectedSongId } = req.body;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    const validMoods = [
      "Happy",
      "Sad",
      "Energetic",
      "Chill",
      "Romantic",
      "Party",
      "Focus",
      "Angry",
      "Nostalgic",
      "Upbeat",
      "Mellow",
      "Intense",
    ];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ error: "Invalid mood", validMoods });
    }

    console.log(
      `Getting single recommendation for mood: ${mood}, selectedSong: ${selectedSongId}`
    );

    // Run Python mood matcher
    const moodResults = await runMoodMatcher(mood, selectedSongId);

    if (!moodResults.matches || moodResults.matches.length === 0) {
      return res.json({
        mood,
        selectedSongId,
        recommendation: null,
        message: "No matching tracks found for this mood",
      });
    }

    // Get the best match
    const bestMatch = moodResults.matches[0];

    // Get detailed track information from Spotify
    const spotifyTracks = await getSpotifyTrackDetails([bestMatch.track_id]);
    const spotifyTrack = spotifyTracks[0] || null;

    const recommendation = {
      ...bestMatch,
      spotify: spotifyTrack,
      mood_score: bestMatch.mood_score,
      features: bestMatch.features,
    };

    res.json({
      mood,
      selectedSongId,
      recommendation,
    });
  } catch (error) {
    console.error("Single recommendation error:", error.message);
    res.status(500).json({
      error: "Failed to get recommendation",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;

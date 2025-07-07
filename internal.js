// Animation sequence
function startAnimationSequence() {
  const firstText = document.getElementById("firstText");
  const dualTextContainer = document.getElementById("dualTextContainer");
  const firstDualText = document.getElementById("firstDualText");
  const secondDualText = document.getElementById("secondDualText");
  const tutorialContainer = document.getElementById("tutorialContainer");
  const searchContainer = document.getElementById("searchContainer");
  const lumeraHeader = document.getElementById("lumeraHeader");
  const skipButton = document.getElementById("skipButton");

  let isSkipped = false; // Add this flag

  // Skip button functionality
  skipButton.addEventListener("click", () => {
    isSkipped = true; // Set flag to prevent all animations
    skipButton.style.display = "none";

    // Hide all animation elements immediately
    firstText.classList.remove("visible");
    dualTextContainer.classList.remove("visible");
    firstDualText.classList.remove("visible");
    secondDualText.classList.remove("visible");

    // Show tutorial and header immediately
    setTimeout(() => {
      tutorialContainer.classList.add("visible");
      lumeraHeader.classList.add("visible");
    }, 100);
  });

  // 🔥 TIMING CONTROLS - Only run if not skipped
  // Phase 1: Show "LUMERA"
  setTimeout(() => {
    if (!isSkipped) firstText.classList.add("visible");
  }, 500);

  // Phase 2: Hide first text and show dual text container
  setTimeout(() => {
    if (!isSkipped) firstText.classList.remove("visible");
  }, 3000);

  setTimeout(() => {
    if (!isSkipped) {
      dualTextContainer.classList.add("visible");
      firstDualText.classList.add("visible");
    }
  }, 4500);

  // Phase 3: Show second dual text below the first
  setTimeout(() => {
    if (!isSkipped) secondDualText.classList.add("visible");
  }, 7000);

  // Phase 4: Hide both dual texts and show tutorial
  setTimeout(() => {
    if (!isSkipped) {
      firstDualText.classList.remove("visible");
      secondDualText.classList.remove("visible");
      dualTextContainer.classList.remove("visible");
    }
  }, 9000);

  setTimeout(() => {
    if (!isSkipped) {
      tutorialContainer.classList.add("visible");
      lumeraHeader.classList.add("visible");
      skipButton.style.display = "none";
    }
  }, 10000);

  // Phase 5: Show search bar when "get started" is clicked
  const getStartedBtn = document.querySelector(".get-started-btn");
  getStartedBtn.addEventListener("click", () => {
    tutorialContainer.classList.remove("visible");
    setTimeout(() => {
      searchContainer.classList.add("visible");
    }, 600);
  });

  const submitBtn = document.querySelector(".submit-btn");
  getStartedBtn.addEventListener("click", () => {
    tutorialContainer.classList.remove("visible");
    setTimeout(() => {
      searchContainer.classList.add("visible");
    }, 600);
  });
}

// Spotify search functionality
let searchTimeout;
let selectedSong = null;

function initializeSpotifySearch() {
  const searchBar = document.getElementById("songSearch");
  const searchResults = document.getElementById("searchResults");

  searchBar.addEventListener("input", function (e) {
    const query = e.target.value.trim();

    // Clear previous timeout
    clearTimeout(searchTimeout);

    if (query.length === 0) {
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      return;
    }

    // Debounce search requests
    searchTimeout = setTimeout(() => {
      searchSpotify(query);
    }, 300);
  });

  // Hide results when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search-wrapper")) {
      searchResults.style.display = "none";
    }
  });
}

async function searchSpotify(query) {
  const searchResults = document.getElementById("searchResults");

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.tracks && data.tracks.length > 0) {
      displaySearchResults(data.tracks);
    } else {
      searchResults.innerHTML = '<div class="no-results">No songs found</div>';
      searchResults.style.display = "block";
    }
  } catch (error) {
    console.error("Search error:", error);
    searchResults.innerHTML =
      '<div class="error-message">Search failed. Please try again.</div>';
    searchResults.style.display = "block";
  }
}

function displaySearchResults(tracks) {
  const searchResults = document.getElementById("searchResults");

  searchResults.innerHTML = tracks
    .map(
      (track) => `
      <div class="search-result-item" data-track-id="${
        track.id
      }" data-track-name="${track.name}" data-track-artists="${track.artists}">
        <div class="track-info">
          <div class="track-name">${track.name}</div>
          <div class="track-artist">${track.artists}</div>
        </div>
        ${
          track.image
            ? `<img src="${track.image}" alt="Album cover" class="track-image">`
            : ""
        }
      </div>
    `
    )
    .join("");

  searchResults.style.display = "block";

  // Add click handlers to results
  searchResults.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      const trackName = this.dataset.trackName;
      const trackArtists = this.dataset.trackArtists;
      const trackId = this.dataset.trackId;

      // Update search bar with selected song
      document.getElementById(
        "songSearch"
      ).value = `${trackName} - ${trackArtists}`;

      // Store selected song data
      selectedSong = {
        id: trackId,
        name: trackName,
        artists: trackArtists,
        image: this.querySelector(".track-image")?.src || "",
        spotifyUrl: `https://open.spotify.com/track/${trackId}`,
      };

      // Hide results
      searchResults.style.display = "none";
    });
  });
}

// Start the animation when page loads
window.addEventListener("load", () => {
  startAnimationSequence();
  initializeSpotifySearch();
});

// Remove focus from dropdown after selection
const glassDropdown = document.querySelector(".glass-dropdown");
if (glassDropdown) {
  glassDropdown.addEventListener("change", function (e) {
    e.target.blur();
  });
}

// Submit button fade to 'ha.' page
const submitBtn = document.querySelector(".submit-btn");
const searchContainer = document.getElementById("searchContainer");
const haPage = document.getElementById("haPage");

// Add mood selection variables
let selectedMood = null;
let currentRecommendation = null;
let allRecommendations = [];
let currentRecommendationIndex = 0;

// Function to get mood selection from dropdown
function getSelectedMood() {
  const moodDropdown = document.querySelector(".glass-dropdown");
  const selectedValue = moodDropdown ? moodDropdown.value : null;

  // Convert to proper case to match your server's expected format
  if (selectedValue && selectedValue !== "Select a mood") {
    return selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1);
  }

  return null;
}
// Complete client-side mood matcher integration
// Place this entire code block in your main <script> tag

// ===== CLIENT-SIDE MOOD MATCHER CLASS =====
class ClientMoodMatcher {
  constructor() {
    this.tracksData = null;
    this.isLoading = false;

    // Mood to audio features mapping
    this.MOOD_FEATURES = {
      Happy: {
        valence: [0.6, 1.0],
        energy: [0.5, 1.0],
        danceability: [0.5, 1.0],
        tempo: [100, 180],
        acousticness: [0.0, 0.5],
      },
      Sad: {
        valence: [0.0, 0.4],
        energy: [0.0, 0.4],
        tempo: [60, 100],
        acousticness: [0.3, 1.0],
        instrumentalness: [0.0, 0.8],
      },
      Energetic: {
        energy: [0.7, 1.0],
        danceability: [0.6, 1.0],
        tempo: [120, 200],
        valence: [0.5, 1.0],
        loudness: [-10, 0],
      },
      Chill: {
        energy: [0.0, 0.5],
        tempo: [60, 110],
        valence: [0.3, 0.7],
        acousticness: [0.2, 1.0],
        danceability: [0.3, 0.7],
      },
      Romantic: {
        valence: [0.4, 0.8],
        energy: [0.2, 0.6],
        tempo: [70, 120],
        acousticness: [0.3, 0.8],
        instrumentalness: [0.0, 0.3],
      },
      Party: {
        energy: [0.7, 1.0],
        danceability: [0.7, 1.0],
        valence: [0.6, 1.0],
        tempo: [110, 180],
        speechiness: [0.0, 0.4],
      },
      Focus: {
        energy: [0.3, 0.7],
        valence: [0.4, 0.7],
        speechiness: [0.0, 0.2],
        instrumentalness: [0.1, 1.0],
        acousticness: [0.2, 0.8],
      },
      Angry: {
        energy: [0.7, 1.0],
        valence: [0.0, 0.4],
        tempo: [100, 200],
        loudness: [-8, 0],
        danceability: [0.3, 0.8],
      },
      Nostalgic: {
        valence: [0.2, 0.6],
        energy: [0.2, 0.6],
        tempo: [70, 120],
        acousticness: [0.4, 0.9],
        instrumentalness: [0.0, 0.5],
      },
      Upbeat: {
        energy: [0.6, 1.0],
        valence: [0.6, 1.0],
        danceability: [0.5, 1.0],
        tempo: [110, 180],
        acousticness: [0.0, 0.4],
      },
      Mellow: {
        energy: [0.0, 0.5],
        valence: [0.3, 0.7],
        tempo: [60, 110],
        acousticness: [0.3, 0.9],
        danceability: [0.2, 0.6],
      },
      Intense: {
        energy: [0.8, 1.0],
        tempo: [120, 200],
        loudness: [-6, 0],
        danceability: [0.4, 1.0],
        valence: [0.0, 0.8],
      },
    };
  }

  async loadTracksData() {
    if (this.isLoading) return;
    if (this.tracksData) return;

    this.isLoading = true;

    try {
      // Try multiple methods to load the CSV
      let csvText;

      if (window.fs && window.fs.readFile) {
        // If uploaded via file input
        csvText = await window.fs.readFile("tracks.csv", { encoding: "utf8" });
      } else {
        // Try to fetch from server
        const response = await fetch("/tracks.csv");
        if (!response.ok) {
          throw new Error("tracks.csv not found. Please upload the file.");
        }
        csvText = await response.text();
      }

      this.tracksData = this.parseCSV(csvText);
      console.log(`Loaded ${this.tracksData.length} tracks`);
      this.cleanData();
    } catch (error) {
      console.error("Error loading tracks data:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          let value = values[index];
          if (value && !isNaN(value) && value !== "") {
            value = parseFloat(value);
          }
          row[header] = value;
        });
        data.push(row);
      }
    }

    return data;
  }

  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  cleanData() {
    if (!this.tracksData) return;

    const essentialFeatures = ["valence", "energy", "danceability", "tempo"];

    this.tracksData = this.tracksData.filter((track) => {
      return essentialFeatures.every(
        (feature) =>
          track[feature] !== undefined &&
          track[feature] !== null &&
          track[feature] !== "" &&
          !isNaN(track[feature])
      );
    });

    const optionalFeatures = [
      "acousticness",
      "instrumentalness",
      "speechiness",
      "liveness",
    ];

    optionalFeatures.forEach((feature) => {
      const values = this.tracksData
        .map((track) => track[feature])
        .filter(
          (val) =>
            val !== undefined && val !== null && val !== "" && !isNaN(val)
        );

      if (values.length > 0) {
        const median = this.calculateMedian(values);
        this.tracksData.forEach((track) => {
          if (
            track[feature] === undefined ||
            track[feature] === null ||
            track[feature] === "" ||
            isNaN(track[feature])
          ) {
            track[feature] = median;
          }
        });
      }
    });

    if (this.tracksData.some((track) => track.popularity !== undefined)) {
      this.tracksData = this.tracksData.filter(
        (track) => track.popularity === undefined || track.popularity > 0
      );
    }

    console.log(`After cleaning: ${this.tracksData.length} tracks`);
  }

  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateMoodScore(track, moodCriteria) {
    let score = 0;
    let totalWeight = 0;

    Object.entries(moodCriteria).forEach(([feature, [minVal, maxVal]]) => {
      if (
        track[feature] !== undefined &&
        track[feature] !== null &&
        !isNaN(track[feature])
      ) {
        const featureValue = track[feature];
        let featureScore;

        if (featureValue >= minVal && featureValue <= maxVal) {
          featureScore = 1.0;
        } else {
          const distance =
            featureValue < minVal
              ? minVal - featureValue
              : featureValue - maxVal;
          featureScore = Math.max(0, Math.exp(-distance * 2));
        }

        score += featureScore;
        totalWeight += 1;
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  async findSongsByMood(mood, selectedSongId = null, limit = 10) {
    if (!this.tracksData) {
      await this.loadTracksData();
    }

    if (!this.MOOD_FEATURES[mood]) {
      throw new Error(`Unknown mood: ${mood}`);
    }

    const moodCriteria = this.MOOD_FEATURES[mood];
    console.log(`Finding songs for mood: ${mood}`);

    const tolerance = 0.3;
    let filteredTracks = this.tracksData.filter((track) => {
      return Object.entries(moodCriteria).every(
        ([feature, [minVal, maxVal]]) => {
          if (
            track[feature] === undefined ||
            track[feature] === null ||
            isNaN(track[feature])
          ) {
            return true;
          }

          const expandedMin = Math.max(0, minVal - tolerance);
          const expandedMax =
            maxVal <= 1
              ? Math.min(1, maxVal + tolerance)
              : maxVal + tolerance * maxVal;

          return track[feature] >= expandedMin && track[feature] <= expandedMax;
        }
      );
    });

    console.log(`Pre-filtered to ${filteredTracks.length} tracks`);

    const tracksWithScores = filteredTracks.map((track) => ({
      ...track,
      mood_score: this.calculateMoodScore(track, moodCriteria),
    }));

    tracksWithScores.sort((a, b) => b.mood_score - a.mood_score);

    const results = [];
    for (const track of tracksWithScores) {
      if (results.length >= limit) break;

      if (selectedSongId && track.track_id === selectedSongId) continue;

      results.push({
        track_id: track.track_id,
        name: track.name,
        artists: track.track_artists || track.artists,
        genres: track.genres,
        mood_score: Math.round(track.mood_score * 1000) / 1000,
        features: {
          valence: track.valence,
          energy: track.energy,
          danceability: track.danceability,
          tempo: track.tempo,
          popularity: track.popularity || 0,
        },
      });
    }

    console.log(`Found ${results.length} recommendations`);
    return results;
  }

  getTrackById(trackId) {
    if (!this.tracksData) return null;

    const track = this.tracksData.find((t) => t.track_id === trackId);
    if (!track) return null;

    return {
      track_id: track.track_id,
      name: track.name,
      artists: track.track_artists || track.artists,
      genres: track.genres,
      features: {
        valence: track.valence,
        energy: track.energy,
        danceability: track.danceability,
        tempo: track.tempo,
        acousticness: track.acousticness,
        instrumentalness: track.instrumentalness,
        speechiness: track.speechiness,
        liveness: track.liveness,
        popularity: track.popularity || 0,
      },
    };
  }
}

// ===== INITIALIZE MOOD MATCHER =====
const clientMoodMatcher = new ClientMoodMatcher();

// ===== UPDATED getRecommendations FUNCTION =====
async function getRecommendations(mood, selectedSongId = null, limit = 35) {
  try {
    console.log(`Getting client-side recommendations for mood: ${mood}`);

    // Use client-side mood matcher
    const moodResults = await clientMoodMatcher.findSongsByMood(
      mood,
      selectedSongId,
      limit
    );

    if (!moodResults || moodResults.length === 0) {
      return {
        mood,
        selectedSongId,
        recommendations: [],
        message: "No matching tracks found for this mood",
      };
    }

    // Get track IDs for Spotify API
    const trackIds = moodResults.map((match) => match.track_id);

    // Get detailed track information from Spotify
    const response = await fetch("/api/spotify-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackIds }),
    });

    if (!response.ok) {
      throw new Error("Failed to get Spotify track details");
    }

    const spotifyData = await response.json();
    const spotifyTracks = spotifyData.tracks || [];

    // Combine mood matching data with Spotify data
    const recommendations = moodResults.map((match) => {
      const spotifyTrack = spotifyTracks.find(
        (track) => track.id === match.track_id
      );

      return {
        ...match,
        spotify: spotifyTrack || null,
        mood_score: match.mood_score,
        features: match.features,
      };
    });

    return {
      mood,
      selectedSongId,
      recommendations,
      total_found: moodResults.length,
    };
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
}

// ===== DISPLAY RECOMMENDATION FUNCTION =====
function displayRecommendation(recommendation) {
  const haContent = document.getElementById("haContent");
  haContent.innerHTML = "";

  if (!recommendation || !recommendation.spotify) {
    haContent.innerHTML = `<div style="color:white;font-size:clamp(1rem, 2.5vw, 2rem);">No recommendation found. Try a different mood!</div>`;
    return;
  }

  const spotifyTrack = recommendation.spotify;

  // Create song display container
  const songDisplay = document.createElement("div");
  songDisplay.className = "song-display";

  // Create song image
  const songImage = document.createElement("img");
  songImage.src = spotifyTrack.image || "assets/default-album.png";
  songImage.alt = "Album cover";
  songImage.className = "song-image";

  // Create song info container
  const songInfo = document.createElement("div");
  songInfo.className = "song-info";

  // Create song title
  const songTitle = document.createElement("div");
  songTitle.className = "song-title";
  const name = spotifyTrack.name;
  songTitle.textContent = name.length > 25 ? name.slice(0, 22) + "..." : name;

  // Create song artist
  const songArtist = document.createElement("div");
  songArtist.className = "song-artist";
  songArtist.textContent = spotifyTrack.artists;
    songTitle.textContent = name.length > 20 ? name.slice(0, 17) + "..." : name;


  // Create button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "button-container";

  // Create Spotify button
  const spotifyBtn = document.createElement("a");
  spotifyBtn.href = spotifyTrack.external_url;
  spotifyBtn.target = "_blank";
  spotifyBtn.className = "spotify-btn";

  // Create Spotify button content
  const spotifyIcon = document.createElement("img");
  spotifyIcon.src = "assets/spotify.svg";
  spotifyIcon.alt = "Spotify";
  spotifyIcon.width = 20;
  spotifyIcon.height = 20;

  const spotifyText = document.createElement("span");
  spotifyText.textContent = "open on spotify";

  spotifyBtn.appendChild(spotifyIcon);
  spotifyBtn.appendChild(spotifyText);

  // Create reroll button
  const rerollBtn = document.createElement("button");
  rerollBtn.className = "reroll-btn";
  rerollBtn.textContent = "reroll";

  // Add click handler for reroll button
  rerollBtn.addEventListener("click", async function () {
    try {
      // Show loading state
      rerollBtn.textContent = "getting new song...";
      rerollBtn.disabled = true;

      // Check if we have more recommendations in the current batch
      if (currentRecommendationIndex + 1 < allRecommendations.length) {
        // Move to next recommendation in the batch
        currentRecommendationIndex++;
        currentRecommendation = allRecommendations[currentRecommendationIndex];
        displayRecommendation(currentRecommendation);
      } else {
        // We've exhausted the current batch, get a new batch
        const newRecommendationsData = await getRecommendations(
          selectedMood,
          selectedSong?.id,
          30
        );

        if (
          newRecommendationsData.recommendations &&
          newRecommendationsData.recommendations.length > 0
        ) {
          // Update with new batch
          allRecommendations = newRecommendationsData.recommendations;
          currentRecommendationIndex = 0;
          currentRecommendation =
            allRecommendations[currentRecommendationIndex];
          displayRecommendation(currentRecommendation);
        } else {
          throw new Error("No new recommendations found");
        }
      }
    } catch (error) {
      console.error("Reroll error:", error);
      rerollBtn.textContent = "try again";
      rerollBtn.disabled = false;
    } finally {
      // Reset button state if not already reset
      if (rerollBtn.textContent === "getting new song...") {
        rerollBtn.textContent = "reroll";
        rerollBtn.disabled = false;
      }
    }
  });

  // Create preview button (if preview URL is available)
  if (spotifyTrack.preview_url) {
    const previewBtn = document.createElement("button");
    previewBtn.className = "preview-btn";
    previewBtn.textContent = "preview";

    let audio = null;
    previewBtn.addEventListener("click", function () {
      if (audio && !audio.paused) {
        audio.pause();
        previewBtn.textContent = "preview";
      } else {
        if (audio) {
          audio.pause();
        }
        audio = new Audio(spotifyTrack.preview_url);
        audio.play();
        previewBtn.textContent = "stop";

        audio.onended = function () {
          previewBtn.textContent = "preview";
        };
      }
    });

    buttonContainer.appendChild(previewBtn);
  }

  // Append elements
  buttonContainer.appendChild(spotifyBtn);
  buttonContainer.appendChild(rerollBtn);

  songInfo.appendChild(songTitle);
  songInfo.appendChild(songArtist);
  songInfo.appendChild(buttonContainer);

  songDisplay.appendChild(songImage);
  songDisplay.appendChild(songInfo);

  haContent.appendChild(songDisplay);
}

// ===== INITIALIZATION AND EVENT HANDLERS =====
window.addEventListener("load", async () => {
  try {
    console.log("Loading tracks data...");

    // Show loading indicator
    const loadingElement = document.createElement("div");
    loadingElement.id = "loading-indicator";
    loadingElement.innerHTML = `
      <div style="
        position: fixed;
        bottom: 10%;
        right: 100%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
      ">
        <div>Loading music database...</div>
        <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.7;">Proceed after this is done :)</div>
      </div>
    `;
    document.body.appendChild(loadingElement);

    // Load the tracks data
    await clientMoodMatcher.loadTracksData();

    // Remove loading indicator
    document.body.removeChild(loadingElement);

    console.log("Tracks data loaded successfully");

    // Start your existing animation sequence
    if (typeof startAnimationSequence === "function") {
      startAnimationSequence();
    }
    if (typeof initializeSpotifySearch === "function") {
      initializeSpotifySearch();
    }
  } catch (error) {
    console.error("Error loading tracks data:", error);

    // Show error message
    const errorElement = document.createElement("div");
    errorElement.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
      ">
        <div>Error loading music database</div>
        <div style="margin-top: 10px; font-size: 0.9em;">Please make sure tracks.csv is available</div>
        <button onclick="location.reload()" style="
          margin-top: 10px;
          padding: 5px 15px;
          background: white;
          color: red;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        ">Retry</button>
      </div>
    `;
    document.body.appendChild(errorElement);

    // Remove loading indicator if it exists
    const loadingElement = document.getElementById("loading-indicator");
    if (loadingElement) {
      document.body.removeChild(loadingElement);
    }
  }
});

// ===== SUBMIT BUTTON HANDLER =====
document.addEventListener("DOMContentLoaded", function () {
  const submitBtn = document.querySelector(".submit-btn");
  const searchContainer = document.getElementById("searchContainer");
  const haPage = document.getElementById("haPage");

  if (submitBtn && searchContainer && haPage) {
    haPage.style.display = "none";
    haPage.style.opacity = 0;

    // Remove existing event listener and add new one
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    newSubmitBtn.addEventListener("click", async function () {
      // Get selected mood
      selectedMood = getSelectedMood();

      if (!selectedMood) {
        alert("Please select a mood first!");
        return;
      }

      try {
        // Show loading state
        newSubmitBtn.textContent = "finding your song...";
        newSubmitBtn.disabled = true;

        // Get multiple recommendations using client-side processing
        const recommendationsData = await getRecommendations(
          selectedMood,
          selectedSong?.id,
          30
        );

        if (
          recommendationsData.recommendations &&
          recommendationsData.recommendations.length > 0
        ) {
          allRecommendations = recommendationsData.recommendations;
          currentRecommendationIndex = 0;
          currentRecommendation =
            allRecommendations[currentRecommendationIndex];
          displayRecommendation(currentRecommendation);

          // Transition to results page
          searchContainer.style.transition = "opacity 0.7s";
          searchContainer.style.opacity = 0;

          setTimeout(() => {
            searchContainer.style.display = "none";
            haPage.style.display = "flex";
            setTimeout(() => {
              haPage.style.opacity = 1;
            }, 50);
          }, 700);
        } else {
          throw new Error("No recommendations found");
        }
      } catch (error) {
        console.error("Submit error:", error);
        alert("Failed to get recommendations. Please try again!");
      } finally {
        // Reset button state
        newSubmitBtn.textContent = "submit";
        newSubmitBtn.disabled = false;
      }
    });
  }

  // Add dropdown change handler
  const moodDropdown = document.querySelector(".glass-dropdown");
  if (moodDropdown) {
    moodDropdown.addEventListener("change", function () {
      selectedMood = getSelectedMood();
    });
  }
});

// Make clientMoodMatcher globally available
window.clientMoodMatcher = clientMoodMatcher;

// Helper function to go back to search (you can add a back button)
function goBackToSearch() {
  haPage.style.transition = "opacity 0.7s";
  haPage.style.opacity = 0;

  setTimeout(() => {
    haPage.style.display = "none";
    searchContainer.style.display = "block";
    setTimeout(() => {
      searchContainer.style.opacity = 1;
    }, 50);
  }, 700);
}

// Add back button functionality
const haBackButton = document.getElementById("haBackButton");
if (haBackButton) {
  haBackButton.addEventListener("click", function () {
    haPage.style.transition = "opacity 0.7s";
    haPage.style.opacity = 0;
    setTimeout(() => {
      haPage.style.display = "none";
      searchContainer.style.display = "block";
      setTimeout(() => {
        searchContainer.style.opacity = 1;
      }, 50);
    }, 700);
  });
}

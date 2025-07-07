import pandas as pd
import numpy as np
import sys
import json
import os
from typing import List, Dict, Any

# Mood to audio features mapping
MOOD_FEATURES = {
    "Happy": {
        "valence": (0.6, 1.0),
        "energy": (0.5, 1.0),
        "danceability": (0.5, 1.0),
        "tempo": (100, 180),
        "acousticness": (0.0, 0.5)
    },
    "Sad": {
        "valence": (0.0, 0.4),
        "energy": (0.0, 0.4),
        "tempo": (60, 100),
        "acousticness": (0.3, 1.0),
        "instrumentalness": (0.0, 0.8)
    },
    "Energetic": {
        "energy": (0.7, 1.0),
        "danceability": (0.6, 1.0),
        "tempo": (120, 200),
        "valence": (0.5, 1.0),
        "loudness": (-10, 0)
    },
    "Chill": {
        "energy": (0.0, 0.5),
        "tempo": (60, 110),
        "valence": (0.3, 0.7),
        "acousticness": (0.2, 1.0),
        "danceability": (0.3, 0.7)
    },
    "Romantic": {
        "valence": (0.4, 0.8),
        "energy": (0.2, 0.6),
        "tempo": (70, 120),
        "acousticness": (0.3, 0.8),
        "instrumentalness": (0.0, 0.3)
    },
    "Party": {
        "energy": (0.7, 1.0),
        "danceability": (0.7, 1.0),
        "valence": (0.6, 1.0),
        "tempo": (110, 180),
        "speechiness": (0.0, 0.4)
    },
    "Focus": {
        "energy": (0.3, 0.7),
        "valence": (0.4, 0.7),
        "speechiness": (0.0, 0.2),
        "instrumentalness": (0.1, 1.0),
        "acousticness": (0.2, 0.8)
    },
    "Angry": {
        "energy": (0.7, 1.0),
        "valence": (0.0, 0.4),
        "tempo": (100, 200),
        "loudness": (-8, 0),
        "danceability": (0.3, 0.8)
    },
    "Nostalgic": {
        "valence": (0.2, 0.6),
        "energy": (0.2, 0.6),
        "tempo": (70, 120),
        "acousticness": (0.4, 0.9),
        "instrumentalness": (0.0, 0.5)
    },
    "Upbeat": {
        "energy": (0.6, 1.0),
        "valence": (0.6, 1.0),
        "danceability": (0.5, 1.0),
        "tempo": (110, 180),
        "acousticness": (0.0, 0.4)
    },
    "Mellow": {
        "energy": (0.0, 0.5),
        "valence": (0.3, 0.7),
        "tempo": (60, 110),
        "acousticness": (0.3, 0.9),
        "danceability": (0.2, 0.6)
    },
    "Intense": {
        "energy": (0.8, 1.0),
        "tempo": (120, 200),
        "loudness": (-6, 0),
        "danceability": (0.4, 1.0),
        "valence": (0.0, 0.8)
    }
}

class MoodMatcher:
    def __init__(self, csv_path: str = "tracks.csv"):
        self.csv_path = csv_path
        self.df = None
        self.load_data()
    
    def load_data(self):
        """Load the CSV data"""
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        try:
            print(f"Loading CSV data from: {self.csv_path}", file=sys.stderr)
            self.df = pd.read_csv(self.csv_path, low_memory=False)
            print(f"Loaded {len(self.df)} tracks", file=sys.stderr)
            
            # Clean the data
            self.clean_data()
            
        except Exception as e:
            print(f"Error loading CSV: {e}", file=sys.stderr)
            raise
    
    def clean_data(self):
        """Clean and preprocess the data"""
        # Remove rows with missing essential features
        essential_features = ['valence', 'energy', 'danceability', 'tempo']
        self.df = self.df.dropna(subset=essential_features)
        
        # Fill missing values for optional features
        optional_features = ['acousticness', 'instrumentalness', 'speechiness', 'liveness']
        for feature in optional_features:
            if feature in self.df.columns:
                self.df[feature] = self.df[feature].fillna(self.df[feature].median())
        
        # Filter out tracks with 0 popularity if popularity exists
        if 'popularity' in self.df.columns:
            self.df = self.df[self.df['popularity'] > 0]
        
        print(f"After cleaning: {len(self.df)} tracks", file=sys.stderr)
    
    def calculate_mood_score(self, track_features: Dict, mood_criteria: Dict) -> float:
        """Calculate how well a track matches a mood"""
        score = 0
        total_weight = 0
        
        for feature, (min_val, max_val) in mood_criteria.items():
            if feature in track_features and not pd.isna(track_features[feature]):
                feature_value = track_features[feature]
                
                # Calculate score based on how well the feature fits the range
                if min_val <= feature_value <= max_val:
                    feature_score = 1.0
                else:
                    # Penalize based on distance from range
                    if feature_value < min_val:
                        distance = min_val - feature_value
                    else:
                        distance = feature_value - max_val
                    
                    # Use exponential decay for penalty
                    feature_score = max(0, np.exp(-distance * 2))
                
                score += feature_score
                total_weight += 1
        
        return score / total_weight if total_weight > 0 else 0
    
    def find_songs_by_mood(self, mood: str, selected_song_id: str = None, limit: int = 10) -> List[Dict]:
        """Find songs that match a specific mood"""
        if mood not in MOOD_FEATURES:
            raise ValueError(f"Unknown mood: {mood}")
        
        mood_criteria = MOOD_FEATURES[mood]
        print(f"Finding songs for mood: {mood}", file=sys.stderr)
        
        # Pre-filter the dataframe based on mood criteria for better performance
        filtered_df = self.df.copy()
        
        # Apply basic filters first to reduce dataset size
        for feature, (min_val, max_val) in mood_criteria.items():
            if feature in filtered_df.columns:
                # Keep tracks that are somewhat close to the range (with some tolerance)
                tolerance = 0.3
                expanded_min = max(0, min_val - tolerance)
                expanded_max = min(1, max_val + tolerance) if max_val <= 1 else max_val + tolerance * max_val
                
                filtered_df = filtered_df[
                    (filtered_df[feature].isna()) | 
                    ((filtered_df[feature] >= expanded_min) & (filtered_df[feature] <= expanded_max))
                ]
        
        print(f"Pre-filtered to {len(filtered_df)} tracks", file=sys.stderr)
        
        # Calculate mood scores using vectorized operations
        feature_columns = list(mood_criteria.keys())
        available_features = [f for f in feature_columns if f in filtered_df.columns]
        
        if not available_features:
            print("No matching features found", file=sys.stderr)
            return []
        
        # Calculate scores for all tracks at once
        scores = np.zeros(len(filtered_df))
        
        for feature in available_features:
            min_val, max_val = mood_criteria[feature]
            feature_values = filtered_df[feature].fillna(filtered_df[feature].median())
            
            # Vectorized score calculation
            in_range = (feature_values >= min_val) & (feature_values <= max_val)
            below_range = feature_values < min_val
            above_range = feature_values > max_val
            
            feature_scores = np.ones(len(feature_values))
            feature_scores[below_range] = np.exp(-(min_val - feature_values[below_range]) * 2)
            feature_scores[above_range] = np.exp(-(feature_values[above_range] - max_val) * 2)
            
            scores += feature_scores
        
        # Normalize scores
        scores = scores / len(available_features)
        
        # Get top matches
        top_indices = np.argsort(scores)[::-1][:limit * 3]  # Get more to filter later
        
        # Convert to list of dictionaries
        results = []
        for idx in top_indices:
            if len(results) >= limit:
                break
                
            actual_idx = filtered_df.index[idx]
            row = filtered_df.iloc[idx]
            
            # Skip if it's the same as selected song
            if selected_song_id and row.get('track_id') == selected_song_id:
                continue
            
            track_info = {
                'track_id': row.get('track_id'),
                'name': row.get('name'),
                'artists': row.get('track_artists'),
                'genres': row.get('genres'),
                'mood_score': round(scores[idx], 3),
                'features': {
                    'valence': row.get('valence'),
                    'energy': row.get('energy'),
                    'danceability': row.get('danceability'),
                    'tempo': row.get('tempo'),
                    'popularity': row.get('popularity', 0)
                }
            }
            results.append(track_info)
        
        print(f"Found {len(results)} recommendations", file=sys.stderr)
        return results
    
    def get_track_by_id(self, track_id: str) -> Dict:
        """Get track information by ID"""
        track = self.df[self.df['track_id'] == track_id]
        if track.empty:
            return None
        
        row = track.iloc[0]
        return {
            'track_id': row.get('track_id'),
            'name': row.get('name'),
            'artists': row.get('track_artists'),
            'genres': row.get('genres'),
            'features': {
                'valence': row.get('valence'),
                'energy': row.get('energy'),
                'danceability': row.get('danceability'),
                'tempo': row.get('tempo'),
                'acousticness': row.get('acousticness'),
                'instrumentalness': row.get('instrumentalness'),
                'speechiness': row.get('speechiness'),
                'liveness': row.get('liveness'),
                'popularity': row.get('popularity', 0)
            }
        }

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        error_output = {
            'error': 'Usage: python mood_matcher.py <mood> [selected_song_id] [csv_path]',
            'mood': None,
            'selected_song_id': None
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)
    
    mood = sys.argv[1]
    selected_song_id = sys.argv[2] if len(sys.argv) > 2 else None
    csv_path = sys.argv[3] if len(sys.argv) > 3 else "tracks.csv"
    
    try:
        matcher = MoodMatcher(csv_path)
        results = matcher.find_songs_by_mood(mood, selected_song_id)
        
        def clean_nan_values(obj):
            if isinstance(obj, dict):
                return {k: clean_nan_values(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan_values(item) for item in obj]
            elif isinstance(obj, float) and (np.isnan(obj) or obj != obj):  # Check for NaN
                return None  # Changed from "None" string to None
            else:
                return obj
        
        cleaned_result = clean_nan_values(results)

        # Output as JSON
        output = {
            'mood': mood,
            'selected_song_id': selected_song_id,
            'matches': cleaned_result
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            'error': str(e),
            'mood': mood,
            'selected_song_id': selected_song_id
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
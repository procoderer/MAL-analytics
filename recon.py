import pandas as pd

anime_cleaned = pd.read_csv("anime cleaned.csv", na_values=['', '\\N', 'NULL'])

anime_cleaned['anime_id'] = anime_cleaned['anime_id'].astype('int64')
anime_cleaned['num_episodes'] = anime_cleaned['num_episodes'].astype('Int64')
anime_cleaned['popularity_rank'] = anime_cleaned['popularity_rank'].astype('int64')
anime_cleaned['members_count'] = anime_cleaned['members_count'].astype('int64')
anime_cleaned['favorites_count'] = anime_cleaned['favorites_count'].astype('int64')
anime_cleaned['watching_count'] = anime_cleaned['watching_count'].astype('int64')
anime_cleaned['completed_count'] = anime_cleaned['completed_count'].astype('int64')
anime_cleaned['on_hold_count'] = anime_cleaned['on_hold_count'].astype('int64')
anime_cleaned['dropped_count'] = anime_cleaned['dropped_count'].astype('int64')
anime_cleaned['plan_to_watch_count'] = anime_cleaned['plan_to_watch_count'].astype('int64')
anime_cleaned['total_count'] = anime_cleaned['total_count'].astype('int64')
anime_cleaned['score_10_count'] = anime_cleaned['score_10_count'].astype('int64')
anime_cleaned['score_09_count'] = anime_cleaned['score_09_count'].astype('int64')
anime_cleaned['score_08_count'] = anime_cleaned['score_08_count'].astype('int64')
anime_cleaned['score_07_count'] = anime_cleaned['score_07_count'].astype('int64')
anime_cleaned['score_06_count'] = anime_cleaned['score_06_count'].astype('int64')
anime_cleaned['score_05_count'] = anime_cleaned['score_05_count'].astype('int64')
anime_cleaned['score_04_count'] = anime_cleaned['score_04_count'].astype('int64')
anime_cleaned['score_03_count'] = anime_cleaned['score_03_count'].astype('int64')
anime_cleaned['score_02_count'] = anime_cleaned['score_02_count'].astype('int64')
anime_cleaned['score_01_count'] = anime_cleaned['score_01_count'].astype('int64')
anime_cleaned['score_count'] = anime_cleaned['score_count'].astype('Int64')
anime_cleaned['score_rank'] = anime_cleaned['score_rank'].astype('Int64')

anime_cleaned['score'] = anime_cleaned['score'].astype('float64')

# String columns - convert to string (preserves null values for PostgreSQL)
anime_cleaned['anime_url'] = anime_cleaned['anime_url'].astype('string')
anime_cleaned['title'] = anime_cleaned['title'].astype('string')
anime_cleaned['synopsis'] = anime_cleaned['synopsis'].astype('string')
anime_cleaned['main_pic'] = anime_cleaned['main_pic'].astype('string')
anime_cleaned['type'] = anime_cleaned['type'].astype('string')
anime_cleaned['source_type'] = anime_cleaned['source_type'].astype('string')
anime_cleaned['status'] = anime_cleaned['status'].astype('string')
anime_cleaned['season'] = anime_cleaned['season'].astype('string')
anime_cleaned['studios'] = anime_cleaned['studios'].astype('string')
anime_cleaned['genres'] = anime_cleaned['genres'].astype('string')
anime_cleaned['clubs'] = anime_cleaned['clubs'].astype('string')
anime_cleaned['pics'] = anime_cleaned['pics'].astype('string')


anime_cleaned['start_date'] = pd.to_datetime(anime_cleaned['start_date'], errors='coerce')
anime_cleaned['end_date'] = pd.to_datetime(anime_cleaned['end_date'], errors='coerce')

anime_cleaned.to_csv("anime cleaned.csv", index=False)

print("Data types converted and saved to 'anime cleaned.csv'")

# Load anime_anime cleaned CSV
anime_anime_cleaned = pd.read_csv("anime_anime cleaned.csv", na_values=['', '\\N', 'NULL'])

# Integer columns
anime_anime_cleaned['animeA'] = anime_anime_cleaned['animeA'].astype('int64')
anime_anime_cleaned['animeB'] = anime_anime_cleaned['animeB'].astype('int64')
anime_anime_cleaned['recommendation'] = anime_anime_cleaned['recommendation'].astype('int64')
anime_anime_cleaned['related'] = anime_anime_cleaned['related'].astype('int64')
anime_anime_cleaned['num_recommenders'] = anime_anime_cleaned['num_recommenders'].astype('Int64')

# String columns - convert to string (preserves null values for PostgreSQL)
anime_anime_cleaned['recommendation_url'] = anime_anime_cleaned['recommendation_url'].astype('string')
anime_anime_cleaned['relation_type'] = anime_anime_cleaned['relation_type'].astype('string')

# Write back to CSV
anime_anime_cleaned.to_csv("anime_anime cleaned.csv", index=False)

print("Data types converted and saved to 'anime_anime cleaned.csv'")



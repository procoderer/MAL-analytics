import pandas as pd

anime_cleaned = pd.read_csv("anime cleaned.csv", na_values=['', '\\N', 'NULL'])
anime_anime_cleaned = pd.read_csv("anime_anime cleaned.csv", na_values=['', '\\N', 'NULL'])

print(anime_anime_cleaned["relation_type"].unique())

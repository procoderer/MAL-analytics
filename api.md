# Anime Analytics API Specification

---

## Shared Types

### Anime

Represents a full row from the `anime` table. All routes that return complete anime records use this shape.

- `anime_id` – integer  
- `title` – string  
- `synopsis` – string or null  
- `main_pic` – string or null  
- `type` – string (`anime_type_enum`)  
- `source_type` – string (`source_type_enum`)  
- `num_episodes` – integer or null  
- `status` – string (`anime_status_enum`)  
- `season` – string or null  
- `score` – number or null (NUMERIC(4,2))  
- `favorites_count` – integer or null  
- `members_count` – integer or null  
- `watching_count` – integer or null  
- `completed_count` – integer or null  
- `on_hold_count` – integer or null  
- `dropped_count` – integer or null  
- `plan_to_watch_count` – integer or null  
- `score_10_count` – integer or null  
- `score_9_count` – integer or null  
- `score_8_count` – integer or null  
- `score_7_count` – integer or null  
- `score_6_count` – integer or null  
- `score_5_count` – integer or null  
- `score_4_count` – integer or null  
- `score_3_count` – integer or null  
- `score_2_count` – integer or null  
- `score_1_count` – integer or null  

### Enums

- `anime_type_enum` values: `TV`, `Movie`, `OVA`, `ONA`, `Special`
- `source_type_enum` values: `4-koma manga`, `Book`, `Card game`, `Game`, `Light novel`, `Manga`, `Mixed media`, `Music`, `Novel`, `Original`, `Other`, `Visual novel`, `Web manga`, `Web novel`
- `anime_status_enum` values: `Currently Airing`, `Finished Airing`, `Not yet aired`

---

## Route 1 – Search Anime with Filters

**Route:** `/anime`  
**Method:** `GET`  
**Description:** Returns anime that match optional filters and contain all selected genres.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- `season` – **type:** string (optional, query)
  Season label for the anime (e.g. `"Spring 2019"`). Maps to `:season`.

- `type` – **type:** string (optional, query)  
  Anime type (e.g. `"TV"`, `"Movie"`). Maps to `:type`.

- `source_type` – **type:** string (optional, query)  
  Source material type (e.g. `"manga"`, `"light_novel"`). Maps to `:source_type`.

- `min_score` – **type:** number (optional, query)  
  Minimum average score (inclusive). Maps to `:min_score`.

- `max_score` – **type:** number (optional, query)  
  Maximum average score (inclusive). Maps to `:max_score`.

- `genre_ids` – **type:** array<integer> or comma-separated string (optional, query)  
  Genre IDs that all must be present on the anime. Maps to `:genre_ids`.

- `limit` – **type:** integer (required, query)
  Maximum number of anime to return. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `Anime`

Each item is a full anime row (see `Anime` in Shared Types).

---

## Route 2 – Top Lists by Rating, Popularity, and Favorites

**Route:** `/anime/top-lists`  
**Method:** `GET`  
**Description:** Returns three lists containing the top 10 rated, popular, and favorite anime.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** JSON Object

```jsonc
{
  "rating": [ /* TopAnime */ ],
  "popularity": [ /* TopAnime */ ],
  "favorites": [ /* TopAnime */ ]
}
```

#### TopAnime object

- `anime_id` – **type:** integer  
  Anime ID.

- `title` – **type:** string  
  Anime title.

- `metric` – **type:** number or integer  
  Value used for ranking:  
  - `score` for the `rating` list,  
  - `members_count` for the `popularity` list,  
  - `favorites_count` for the `favorites` list.

---

## Route 3 – Top Anime by a Chosen Metric

**Route:** `/anime/top`  
**Method:** `GET`  
**Description:** Returns top anime ordered by one of rating, popularity, or favorites.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- `metric` – **type:** string (required, query)
  Metric to rank by. One of: `"rating"`, `"popularity"`, `"favorites"`. Maps to `:metric`.

- `limit` – **type:** integer (required, query)
  Maximum number of anime to return. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `RankedAnime`

#### RankedAnime object

- `anime_id` – **type:** integer  
  Anime ID.

- `title` – **type:** string  
  Anime title.

- `score` – **type:** number or null  
  Average score.

- `favorites_count` – **type:** integer or null  
  Favorites count.

- `members_count` – **type:** integer or null  
  Members count.

---

## Route 4 – Recommendations from Recommendation Table + Filters

**Route:** `/anime/:seed_id/recommendations`  
**Method:** `GET`  
**Description:** Gets recommended anime based on another anime using recommendation data and optional filters.

### Route Parameters

- `seed_id` – **type:** integer (required, path)
  ID of the anime to base recommendations on. Maps to `:seed_id`.

### Query Parameters

- `season` – **type:** string (optional, query)  
  Season filter. Maps to `:season`.

- `type` – **type:** string (optional, query)  
  Anime type filter. Maps to `:type`.

- `source_type` – **type:** string (optional, query)  
  Source type filter. Maps to `:source_type`.

- `min_score` – **type:** number (optional, query)  
  Minimum score filter (inclusive). Maps to `:min_score`.

- `max_score` – **type:** number (optional, query)  
  Maximum score filter (inclusive). Maps to `:max_score`.

- `genre_ids` – **type:** array<integer> or comma-separated string (optional, query)  
  Genre IDs that must all be present. Maps to `:genre_ids`.

- `limit` – **type:** integer (required, query)
  Maximum number of recommendations. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `RecommendedAnime`

#### RecommendedAnime object

Contains all `Anime` fields plus:

- `votes` – **type:** integer  
  Number of recommenders for this recommendation (`num_recommenders`).

---

## Route 5 – Similar Anime by Overlapping Genres and Studios

**Route:** `/anime/:seed_id/similar`  
**Method:** `GET`  
**Description:** Gets recommended anime based on overlapping studios and genres with a seed anime.

### Route Parameters

- `seed_id` – **type:** integer (required, path)
  ID of the seed anime. Maps to `:seed_id`.

### Query Parameters

- `limit` – **type:** integer (required, query)
  Maximum number of similar anime. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `SimilarAnime`

#### SimilarAnime object

- `anime_id` – **type:** integer  
- `title` – **type:** string  
- `score` – **type:** number or null  
- `favorites_count` – **type:** integer or null  
- `members_count` – **type:** integer or null  
- `similarity` – **type:** number  
  Weighted similarity score (0–1) based on genre and studio overlap.

---

## Route 6 – Top Rated Anime Ignoring Scores of 1

**Route:** `/anime/top/adjusted-score`  
**Method:** `GET`  
**Description:** Gets top rated anime when scores of 1 are ignored.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- `limit` – **type:** integer (required, query)
  Maximum number of anime to return. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `AdjustedScoreAnime`

#### AdjustedScoreAnime object

- `anime_id` – **type:** integer  
  Anime ID.

- `title` – **type:** string  
  Anime title.

- `adjusted_score` – **type:** number  
  Recomputed average score ignoring 1-star ratings.

- `original_score` – **type:** number or null  
  Original overall score.

- `delta_vs_original` – **type:** number  
  Difference `adjusted_score - original_score`.

- `remaining_ratings` – **type:** integer  
  Number of ratings after removing score=1 (maps to `n_no1`).

- `members_count` – **type:** integer or null  
  Members count.

---

## Route 7 – Rank Years by Average Rating

**Route:** `/stats/years/ratings`  
**Method:** `GET`  
**Description:** Ranks years by the average rating of anime first released in that year.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** JSON Array of `YearRatingStats`

#### YearRatingStats object

- `year` – **type:** integer  
  Release year.

- `n_titles` – **type:** integer  
  Number of titles in that year.

- `total_ratings` – **type:** integer  
  Total number of ratings across those titles.

- `avg_score` – **type:** number  
  Average score of anime from that year.

- `rank_by_avg` – **type:** integer  
  Rank of the year when ordered by `avg_score` (1 = best).

---

## Route 8 – Episodes vs Rating/Favorites/Popularity Stats

**Route:** `/stats/episodes-vs-metrics`  
**Method:** `GET`  
**Description:** Provides bucketed statistics by episode count and correlations between number of episodes and rating, favorites, and popularity.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None  

### Response

- **Return Type:** JSON Object

```jsonc
{
  "bins": [ /* EpisodeBinStats */ ],
  "corr_eps_score": 0.0,
  "corr_eps_favorites": 0.0,
  "corr_eps_members": 0.0
}
```

#### EpisodeBinStats object

- `bucket` – **type:** integer  
  Bucket index (e.g. 1–10 from `width_bucket`).

- `min_eps` – **type:** integer  
  Minimum `num_episodes` in this bucket.

- `max_eps` – **type:** integer  
  Maximum `num_episodes` in this bucket.

- `n` – **type:** integer  
  Number of titles in this bucket.

- `avg_score` – **type:** number or null  
  Average score in this bucket.

- `avg_favorites` – **type:** number or null  
  Average favorites count in this bucket.

- `avg_members` – **type:** number or null  
  Average members count in this bucket.

Top-level correlation fields:

- `corr_eps_score` – **type:** number  
  Correlation between `num_episodes` and `score`.

- `corr_eps_favorites` – **type:** number  
  Correlation between `num_episodes` and `favorites_count`.

- `corr_eps_members` – **type:** number  
  Correlation between `num_episodes` and `members_count`.

---

## Route 9 – Random Pair of Comparable Anime

**Route:** `/anime/compare/random-pair`  
**Method:** `GET`  
**Description:** Returns two random anime with different rating, popularity, and favorites, from sufficiently popular titles.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** JSON Object

```jsonc
{
  "A": { /* RandomAnimeSummary */ },
  "B": { /* RandomAnimeSummary */ }
}
```

#### RandomAnimeSummary object

- `anime_id` – **type:** integer  
  Anime ID.

- `title` – **type:** string  
  Anime title.

- `score` – **type:** number or null  
  Average score.

- `members_count` – **type:** integer or null  
  Members count.

- `favorites_count` – **type:** integer or null  
  Favorites count.

---

## Route 10 – Most Polarizing Anime (Stddev of Ratings)

**Route:** `/anime/ratings/volatile`  
**Method:** `GET`  
**Description:** Ranks anime by the standard deviation of their ratings (i.e., how polarized the ratings are).

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- `limit` – **type:** integer (required, query)
  Maximum number of anime to return. Maps to `:limit`.

### Response

- **Return Type:** JSON Array of `VolatileAnime`

#### VolatileAnime object

- `anime_id` – **type:** integer  
  Anime ID.

- `title` – **type:** string  
  Anime title.

- `rating_count` – **type:** integer  
  Number of ratings used in the calculation.

- `mean_score` – **type:** number  
  Average score.

- `stddev_score` – **type:** number  
  Standard deviation of scores.

---

## Route 11 – Sequel vs First-Season Score Stats

**Route:** `/stats/sequels-vs-first-season`  
**Method:** `GET`  
**Description:** For series with multiple seasons, returns statistics on the score difference between the first season and its sequels.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** JSON Object

#### Fields

- `comparisons` – **type:** integer  
  Number of sequel–root comparisons considered.

- `avg_diff` – **type:** number  
  Average score difference `sequel_score - first_season_score`.

- `median_diff` – **type:** number  
  Median of the score differences.

- `pct_later_higher` – **type:** number  
  Fraction (0–1) of sequels that have a higher score than their first season.

---

## Route 12 – List All Genres

**Route:** `/genres`  
**Method:** `GET`  
**Description:** Returns all distinct anime genres.

### Route Parameters

- **Route Parameter(s):** None

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** JSON Array of `Genre`

#### Genre object

- `name` – **type:** string  
  Genre name.

---

## Route 13 – Get Anime by ID

**Route:** `/anime/:id`  
**Method:** `GET`  
**Description:** Returns the full anime record for the given `anime_id`.

### Route Parameters

- `id` – **type:** integer (required, path)  
  Anime ID. Maps to `:id`.

### Query Parameters

- **Query Parameter(s):** None

### Response

- **Return Type:** `Anime`

Returns the full anime row (see `Anime` in Shared Types).

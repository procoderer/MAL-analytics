export type AnimeType = "Movie" | "ONA" | "OVA" | "Special" | "TV";
export type SourceType =
  | "4-koma manga"
  | "Book"
  | "Card game"
  | "Game"
  | "Light novel"
  | "Manga"
  | "Mixed media"
  | "Music"
  | "Novel"
  | "Original"
  | "Other"
  | "Visual novel"
  | "Web manga"
  | "Web novel";
export type AnimeStatus = "Currently Airing" | "Finished Airing" | "Not yet aired";

export interface Anime {
  anime_id: number;
  title: string;
  synopsis: string | null;
  main_pic: string | null;
  type: AnimeType | null;
  source_type: SourceType | null;
  num_episodes: number | null;
  status: AnimeStatus | null;
  season: string | null;
  score: number | null;
  favorites_count: number | null;
  members_count: number | null;
  watching_count: number | null;
  completed_count: number | null;
  on_hold_count: number | null;
  dropped_count: number | null;
  plan_to_watch_count: number | null;
  score_10_count: number | null;
  score_9_count: number | null;
  score_8_count: number | null;
  score_7_count: number | null;
  score_6_count: number | null;
  score_5_count: number | null;
  score_4_count: number | null;
  score_3_count: number | null;
  score_2_count: number | null;
  score_1_count: number | null;
}

export type AnimeList = Anime[];

export type RecommendedAnime = Anime & { votes: number };

export type RankingMetric = "rating" | "popularity" | "favorites";

export interface TopAnime {
  anime_id: number;
  title: string;
  metric: number | null;
}

export type TopListsResponse = {
  rating: TopAnime[];
  popularity: TopAnime[];
  favorites: TopAnime[];
};

export interface RankedAnime {
  anime_id: number;
  title: string;
  score: number | null;
  favorites_count: number | null;
  members_count: number | null;
}

export interface SimilarAnime {
  anime_id: number;
  title: string;
  score: number | null;
  favorites_count: number | null;
  members_count: number | null;
  similarity: number;
}

export interface AdjustedScoreAnime {
  anime_id: number;
  title: string;
  adjusted_score: number;
  original_score: number | null;
  delta_vs_original: number;
  remaining_ratings: number;
  members_count: number | null;
}

export interface YearRatingStats {
  year: number;
  n_titles: number;
  total_ratings: number;
  avg_score: number;
  rank_by_avg: number;
}

export interface EpisodeBinStats {
  bucket: number;
  min_eps: number;
  max_eps: number;
  n: number;
  avg_score: number | null;
  avg_favorites: number | null;
  avg_members: number | null;
}

export interface EpisodesVsMetricsResponse {
  bins: EpisodeBinStats[];
  corr_eps_score: number;
  corr_eps_favorites: number;
  corr_eps_members: number;
}

export interface RandomAnimeSummary {
  anime_id: number;
  title: string;
  score: number | null;
  members_count: number | null;
  favorites_count: number | null;
}

export type RandomPairResponse = {
  A: RandomAnimeSummary;
  B: RandomAnimeSummary;
};

export interface VolatileAnime {
  anime_id: number;
  title: string;
  rating_count: number;
  mean_score: number;
  stddev_score: number;
}

export interface SequelVsFirstSeasonStats {
  comparisons: number;
  avg_diff: number;
  median_diff: number;
  pct_later_higher: number;
}

export interface Genre {
  name: string;
}


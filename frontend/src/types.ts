// Shared response types for API routes that return full anime records.
// Mirrors the `anime` table schema and enums.

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


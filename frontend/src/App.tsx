import React, { useEffect, useMemo, useState } from "react";
import { RankingMetric, TopAnime, TopListsResponse } from "./types";

const fallbackTopLists: TopListsResponse = {
  rating: [
    { anime_id: 1, title: "Fullmetal Alchemist: Brotherhood", metric: 9.1 },
    { anime_id: 2, title: "Gintama°", metric: 9.0 },
    { anime_id: 3, title: "Hunter x Hunter (2011)", metric: 9.0 },
    { anime_id: 4, title: "Steins;Gate", metric: 8.9 },
    { anime_id: 5, title: "Attack on Titan Season 3 Part 2", metric: 8.9 },
    { anime_id: 6, title: "Gintama: The Final", metric: 8.9 },
    { anime_id: 7, title: "Bleach: TYBW", metric: 8.8 },
    { anime_id: 8, title: "Fate/stay night: UBW", metric: 8.7 },
    { anime_id: 9, title: "Kaguya-sama: Ultra Romantic", metric: 8.7 },
    { anime_id: 10, title: "Violet Evergarden", metric: 8.7 },
  ],
  popularity: [
    { anime_id: 11, title: "Attack on Titan", metric: 1 },
    { anime_id: 12, title: "Death Note", metric: 2 },
    { anime_id: 13, title: "Fullmetal Alchemist: Brotherhood", metric: 3 },
    { anime_id: 14, title: "One Punch Man", metric: 4 },
    { anime_id: 15, title: "Naruto", metric: 5 },
    { anime_id: 16, title: "My Hero Academia", metric: 6 },
    { anime_id: 17, title: "Demon Slayer", metric: 7 },
    { anime_id: 18, title: "One Piece", metric: 8 },
    { anime_id: 19, title: "Tokyo Ghoul", metric: 9 },
    { anime_id: 20, title: "Sword Art Online", metric: 10 },
  ],
  favorites: [
    { anime_id: 21, title: "Fullmetal Alchemist: Brotherhood", metric: 3_200_000 },
    { anime_id: 22, title: "Attack on Titan", metric: 3_100_000 },
    { anime_id: 23, title: "Naruto", metric: 2_900_000 },
    { anime_id: 24, title: "One Piece", metric: 2_800_000 },
    { anime_id: 25, title: "Death Note", metric: 2_750_000 },
    { anime_id: 26, title: "Hunter x Hunter", metric: 2_600_000 },
    { anime_id: 27, title: "Code Geass", metric: 2_500_000 },
    { anime_id: 28, title: "Steins;Gate", metric: 2_400_000 },
    { anime_id: 29, title: "Demon Slayer", metric: 2_250_000 },
    { anime_id: 30, title: "Jujutsu Kaisen", metric: 2_200_000 },
  ],
};

type GameAnime = {
  anime_id: number;
  title: string;
  score: number | null;
  members_count: number | null;
  favorites_count: number | null;
};

type GameState = "playing" | "revealed" | "gameover";

const tabs = ["Home", "Ranking", "Analytics", "Recommend", "Game"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [topLists, setTopLists] = useState<TopListsResponse>(fallbackTopLists);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Home");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/anime/top-lists")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setTopLists(normalizeTopLists(data));
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Live data unavailable. Showing sample data instead.");
        setTopLists(fallbackTopLists);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">Anilytics</div>
        <nav className="nav">
          {tabs.map((t) => (
            <button
              key={t}
              className={"nav-link" + (tab === t ? " nav-link-active" : "")}
              onClick={() => setTab(t)}
              type="button"
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {tab === "Home" ? (
          <HomePage topLists={topLists} loading={loading} error={error} />
        ) : null}
        {tab === "Ranking" ? <RankingPage /> : null}
        {tab === "Analytics" ? <AnalyticsPage /> : null}
        {tab === "Recommend" ? <RecommendPage /> : null}
        {tab === "Game" ? <GamePage /> : null}
      </main>
    </div>
  );
}

function normalizeTopLists(data: unknown): TopListsResponse {
  // Preferred shape per api.md: { rating: TopAnime[], popularity: TopAnime[], favorites: TopAnime[] }
  if (
    data &&
    typeof data === "object" &&
    "rating" in data &&
    "popularity" in data &&
    "favorites" in data
  ) {
    const obj = data as TopListsResponse;
    return {
      rating: (obj.rating ?? []).map((a) => ({
        anime_id: a.anime_id,
        title: a.title,
        metric: toMetric(a.metric),
      })),
      popularity: (obj.popularity ?? []).map((a) => ({
        anime_id: a.anime_id,
        title: a.title,
        metric: toMetric(a.metric),
      })),
      favorites: (obj.favorites ?? []).map((a) => ({
        anime_id: a.anime_id,
        title: a.title,
        metric: toMetric(a.metric),
      })),
    };
  }

  // Fallback to grouping array rows with a `list` discriminator (what the backend currently returns)
  if (Array.isArray(data)) {
    const grouped: TopListsResponse = { rating: [], popularity: [], favorites: [] };
    data.forEach((row: any) => {
      const list = row?.list;
      if (list === "rating" || list === "popularity" || list === "favorites") {
        const key: keyof TopListsResponse = list;
        grouped[key].push({
          anime_id: Number(row.anime_id),
          title: String(row.title ?? ""),
          metric: toMetric(row.metric),
        });
      }
    });
    return grouped;
  }

  return fallbackTopLists;
}

function toMetric(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function HomePage({ topLists, loading, error }: { topLists: TopListsResponse; loading: boolean; error: string | null }) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (filters: {
    season?: string;
    type?: string;
    source_type?: string;
    min_score?: number;
    max_score?: number;
    limit: number;
  }) => {
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (filters.season) params.append('season', filters.season);
      if (filters.type) params.append('type', filters.type);
      if (filters.source_type) params.append('source_type', filters.source_type);
      if (filters.min_score !== undefined) params.append('min_score', filters.min_score.toString());
      if (filters.max_score !== undefined) params.append('max_score', filters.max_score.toString());
      params.append('limit', filters.limit.toString());

      console.log('Search params:', params.toString());
      const res = await fetch(`/api/anime?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Search error response:', errorText);
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('Search results:', data.length, 'items');
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Find your next anime</h1>
          <p className="subtitle">
            Search the catalogue, filter by attributes, and explore quick top lists.
          </p>
        </div>
        <SearchFilters onSearch={handleSearch} />
      </header>

      {error ? <div className="callout">{error}</div> : null}
      {loading ? <div className="pill">Loading live data…</div> : null}
      {searching ? <div className="pill">Searching…</div> : null}
      {searchError ? <div className="callout">{searchError}</div> : null}

      {searchResults.length > 0 ? (
        <div className="card">
          <div className="card-title">Search Results ({searchResults.length})</div>
          <ul className="list">
            {searchResults.map((anime) => (
              <li key={anime.anime_id} className="list-row">
                <span>{anime.title}</span>
                {anime.score != null ? <span className="metric">{Number(anime.score).toFixed(1)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid three">
        <TopList title="Top 10 rated" items={topLists.rating} metricName="rating" />
        <TopList title="Top 10 popular" items={topLists.popularity} metricName="popularity" />
        <TopList title="Top 10 favorited" items={topLists.favorites} metricName="favorites" />
      </div>
    </section>
  );
}

function SearchFilters({ onSearch }: { onSearch: (filters: any) => void }) {
  const [season, setSeason] = useState('');
  const [type, setType] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      season: season || undefined,
      type: type || undefined,
      source_type: sourceType || undefined,
      min_score: minScore ? parseFloat(minScore) : undefined,
      max_score: maxScore ? parseFloat(maxScore) : undefined,
      limit: 20,
    });
  };

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <label className="label">Anime search</label>
      <div className="input-row">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any type</option>
          <option value="TV">TV</option>
          <option value="Movie">Movie</option>
          <option value="OVA">OVA</option>
          <option value="ONA">ONA</option>
          <option value="Special">Special</option>
        </select>
        <select value={season} onChange={(e) => setSeason(e.target.value)}>
          <option value="">Any season</option>
          <option value="Summer 2022">Summer 2022</option>
          <option value="Spring 2022">Spring 2022</option>
          <option value="Winter 2022">Winter 2022</option>
          <option value="Fall 2021">Fall 2021</option>
          <option value="Summer 2021">Summer 2021</option>
          <option value="Spring 2021">Spring 2021</option>
          <option value="Winter 2021">Winter 2021</option>
          <option value="Fall 2020">Fall 2020</option>
          <option value="Summer 2020">Summer 2020</option>
          <option value="Spring 2020">Spring 2020</option>
          <option value="Winter 2020">Winter 2020</option>
        </select>
      </div>
      <div className="input-row">
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          <option value="">Any source</option>
          <option value="Manga">Manga</option>
          <option value="Light novel">Light Novel</option>
          <option value="Original">Original</option>
          <option value="Visual novel">Visual Novel</option>
          <option value="Game">Game</option>
          <option value="Novel">Novel</option>
          <option value="4-koma manga">4-koma Manga</option>
          <option value="Book">Book</option>
          <option value="Card game">Card Game</option>
          <option value="Music">Music</option>
          <option value="Web manga">Web Manga</option>
          <option value="Web novel">Web Novel</option>
          <option value="Mixed media">Mixed Media</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="input-row">
        <input 
          type="number" 
          placeholder="Min score (e.g. 7.0)" 
          step="0.1" 
          min="0" 
          max="10"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />
        <input 
          type="number" 
          placeholder="Max score (e.g. 10.0)" 
          step="0.1" 
          min="0" 
          max="10"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
        />
      </div>
      <button type="submit">Search</button>
    </form>
  );
}

function TopList({ title, items, metricName }: { title: string; items: TopAnime[]; metricName: RankingMetric }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <ol className="top-list">
        {items.map((anime, idx) => (
          <li key={anime.anime_id}>
            <span>{anime.title}</span>
            {metricName === "popularity" ? (
              <span className="metric">#{idx + 1}</span>
            ) : anime.metric != null ? (
              <span className="metric">{metricLabel(metricName, anime.metric)}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function metricLabel(metric: RankingMetric, value: number | null) {
  if (value === null || typeof value !== "number" || Number.isNaN(value)) return "";
  if (metric === "rating") return value.toFixed(1);
  if (metric === "favorites") return value.toLocaleString();
  return `#${value}`;
}

function RankingPage() {
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<RankingMetric>("rating");
  const [page, setPage] = useState(1);
  const [ranked, setRanked] = useState<TopAnime[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const pageSize = 100;
    const offset = (page - 1) * pageSize;

    fetch(`/api/anime/top?metric=${metric}&limit=${pageSize}&offset=${offset}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        // Map RankedAnime to TopAnime format; coerce metrics to numbers so ratings render
        const toNumber = (v: unknown) => {
          const num = Number(v);
          return Number.isFinite(num) ? num : null;
        };

        const mapped = items.map((a: any) => ({
          anime_id: a.anime_id,
          title: a.title,
          metric:
            metric === "rating"
              ? toNumber(a.score)
              : metric === "popularity"
              ? toNumber(a.members_count)
              : toNumber(a.favorites_count),
        }));
        setRanked(mapped);
        setHasNext(items.length === pageSize);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Failed to load rankings. Showing fallback data.");
        setRanked(fallbackTopLists[metric]);
        setHasNext(false);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [metric, page]);

  const filtered = useMemo(
    () =>
      ranked
        .filter((anime) => anime.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const av = a.metric ?? 0;
          const bv = b.metric ?? 0;
          return bv - av; // All metrics: higher values = better ranking
        }),
    [query, ranked, metric]
  );

  const pageSize = 100;
  const totalPages = hasNext ? page + 1 : page; // unknown total; indicate next if hasNext
  const currentPage = page;
  const paged = filtered;

  const canPrev = currentPage > 1;
  const canNext = hasNext;

  useEffect(() => {
    setPage(1);
  }, [metric, query]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Ranking</p>
          <h1>Search by ranking</h1>
          <p className="subtitle">Pick a metric and refine results instantly.</p>
        </div>
        <div className="input-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime"
          />
          <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
            <option value="rating">Rating</option>
            <option value="popularity">Popularity</option>
            <option value="favorites">Favoritism</option>
          </select>
        </div>
      </header>

      {loading && <div className="pill">Loading rankings…</div>}
      {error && <div className="callout">{error}</div>}

      <div className="card">
        <div className="card-title">Results ({filtered.length})</div>
        <ul className="list">
          {paged.map((anime, index) => {
            const rank = (currentPage - 1) * pageSize + index + 1;
            const metricDisplay = metric === "popularity" ? `#${rank}` : metricLabel(metric, anime.metric);
            return (
              <li key={anime.anime_id} className="list-row">
                <span className="rank">{rank}</span>
                <span>{anime.title}</span>
                <span className="metric">{metricDisplay}</span>
              </li>
            );
          })}
        </ul>
        <div className="input-row" style={{ justifyContent: "space-between", gap: "0.75rem" }}>
          <button type="button" onClick={() => setPage(1)} disabled={!canPrev}>
            First 100
          </button>
          <div className="input-row" style={{ gap: "0.5rem" }}>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
              Prev 100
            </button>
            <span
              className="pill"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "90px", lineHeight: 1 }}
            >
              Page {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
            >
              Next 100
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsPage() {
  const analytics = [
    { label: "Median score", value: "7.45" },
    { label: "Most common genre", value: "Action" },
    { label: "Longest running", value: "One Piece" },
    { label: "Peak release year", value: "2016" },
  ];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Interesting patterns</h1>
          <p className="subtitle">Explore detailed analytics from the dataset.</p>
        </div>
      </header>

      <div className="grid four">
        {analytics.map((item) => (
          <div key={item.label} className="stat-card">
            <p className="eyebrow">{item.label}</p>
            <p className="stat-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="accordion-container">
        <AnalyticsAccordion<AdjustedScoreAnime[]>
          title="Top Rated Anime (Ignoring 1-Star Ratings)"
          endpoint="/api/anime/top/adjusted-score"
          renderContent={(data) => <AdjustedScoreView data={data} />}
        />
        <AnalyticsAccordion<YearRatingStats[]>
          title="Ratings by Year"
          endpoint="/api/stats/years/ratings"
          renderContent={(data) => <YearsRatingsView data={data} />}
        />
        <AnalyticsAccordion<EpisodesVsMetricsData>
          title="Episodes vs Metrics"
          endpoint="/api/stats/episodes-vs-metrics"
          renderContent={(data) => <EpisodesVsMetricsView data={data} />}
        />
        <AnalyticsAccordion<VolatileAnime[]>
          title="Most Polarizing Anime"
          endpoint="/api/anime/ratings/volatile"
          renderContent={(data) => <VolatileRatingsView data={data} />}
        />
        <AnalyticsAccordion<SequelStats>
          title="Sequel vs First Season Scores"
          endpoint="/api/stats/sequels-vs-first-season"
          renderContent={(data) => <SequelStatsView data={data} />}
        />
      </div>
    </section>
  );
}

type AccordionProps<T> = {
  title: string;
  endpoint: string;
  renderContent: (data: T) => React.ReactNode;
};

function AnalyticsAccordion<T>({ title, endpoint, renderContent }: AccordionProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !data && !loading) {
      setLoading(true);
      setError(null);
      // Add limit parameter for endpoints that require it
      const url = endpoint.includes('volatile') || endpoint.includes('adjusted-score')
        ? `${endpoint}?limit=20`
        : endpoint;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Request failed");
          return res.json();
        })
        .then((result) => {
          setData(result as T);
          setError(null);
        })
        .catch(() => {
          setError("Failed to load data");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return (
    <div className={`accordion ${isOpen ? "accordion-open" : ""}`}>
      <button className="accordion-header" onClick={handleToggle} type="button">
        <span>{title}</span>
        <span className="accordion-icon">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          {loading && <div className="pill">Loading...</div>}
          {error && <div className="callout">{error}</div>}
          {!loading && !error && data && renderContent(data)}
        </div>
      )}
    </div>
  );
}

type AdjustedScoreAnime = {
  anime_id: number;
  title: string;
  adjusted_score: number;
  original_score: number | null;
};

function AdjustedScoreView({ data }: { data: AdjustedScoreAnime[] }) {
  return (
    <div className="adjusted-score-table">
      <div className="adjusted-score-header">
        <span className="rank-col">Rank</span>
        <span className="title-col">Title</span>
        <span className="score-col">Adjusted Score</span>
        <span className="score-col">Original Score</span>
      </div>
      <ul className="list">
        {data.map((anime, index) => {
          const adjustedScore = Number(anime.adjusted_score);
          const originalScore = anime.original_score != null ? Number(anime.original_score) : null;
          return (
            <li key={anime.anime_id} className="adjusted-score-row">
              <span className="rank-col">{index + 1}</span>
              <span className="title-col">{anime.title}</span>
              <span className="score-col">{Number.isFinite(adjustedScore) ? adjustedScore.toFixed(2) : "N/A"}</span>
              <span className="score-col">
                {originalScore != null && Number.isFinite(originalScore) ? originalScore.toFixed(2) : "N/A"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type YearRatingStats = {
  year: number;
  n_titles: number;
  total_ratings: number;
  avg_score: number;
  rank_by_avg: number;
};

function YearsRatingsView({ data }: { data: YearRatingStats[] }) {
  return (
    <div className="years-ratings-table">
      <div className="years-ratings-header">
        <span className="year-col">Year</span>
        <span className="score-col">Average Score</span>
        <span className="titles-col">Number of Titles</span>
        <span className="rank-col">Yearly Rating Rank</span>
      </div>
      <ul className="list">
        {data
          .sort((a, b) => Number(b.year) - Number(a.year))
          .slice(0, 20)
          .map((stat) => {
            const avgScore = Number(stat.avg_score);
            return (
              <li key={stat.year} className="years-ratings-row">
                <span className="year-col">{stat.year}</span>
                <span className="score-col">{Number.isFinite(avgScore) ? avgScore.toFixed(2) : "N/A"}</span>
                <span className="titles-col">{stat.n_titles.toLocaleString()}</span>
                <span className="rank-col">#{stat.rank_by_avg}</span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

type EpisodeBinStats = {
  bucket: number;
  min_eps: number;
  max_eps: number;
  n: number;
  avg_score: number | null;
  avg_favorites: number | null;
  avg_members: number | null;
};

type EpisodesVsMetricsData = {
  bins: EpisodeBinStats[];
  corr_eps_score: number;
  corr_eps_favorites: number;
  corr_eps_members: number;
};

function EpisodesVsMetricsView({ data }: { data: EpisodesVsMetricsData }) {
  const corrScore = Number(data.corr_eps_score);
  const corrFavorites = Number(data.corr_eps_favorites);
  const corrMembers = Number(data.corr_eps_members);
  
  return (
    <div>
      <div className="card">
        <div className="card-title">Correlations</div>
        <div className="grid three">
          <div className="stat-card">
            <p className="eyebrow">Episodes vs Score</p>
            <p className="stat-value">{Number.isFinite(corrScore) ? corrScore.toFixed(3) : "N/A"}</p>
          </div>
          <div className="stat-card">
            <p className="eyebrow">Episodes vs Favorites</p>
            <p className="stat-value">{Number.isFinite(corrFavorites) ? corrFavorites.toFixed(3) : "N/A"}</p>
          </div>
          <div className="stat-card">
            <p className="eyebrow">Episodes vs Members</p>
            <p className="stat-value">{Number.isFinite(corrMembers) ? corrMembers.toFixed(3) : "N/A"}</p>
          </div>
        </div>
      </div>

      <br />
      <div className="episodes-metrics-table">
        <div className="episodes-metrics-header">
          <span className="range-col">Episode Range</span>
          <span className="titles-col">Number of Titles</span>
          <span className="score-col">Average Score</span>
        </div>
        <ul className="list">
          {data.bins.map((bin) => {
            const avgScore = bin.avg_score != null ? Number(bin.avg_score) : null;
            return (
              <li key={bin.bucket} className="episodes-metrics-row">
                <span className="range-col">
                  {bin.min_eps}–{bin.max_eps} episodes
                </span>
                <span className="titles-col">{bin.n.toLocaleString()}</span>
                <span className="score-col">
                  {avgScore != null && Number.isFinite(avgScore) ? avgScore.toFixed(2) : "N/A"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type VolatileAnime = {
  anime_id: number;
  title: string;
  rating_count: number;
  mean_score: number;
  stddev_score: number;
};

function VolatileRatingsView({ data }: { data: VolatileAnime[] }) {
  return (
    <div className="volatile-table">
      <div className="volatile-table">
        <div className="volatile-header">
          <span className="rank-col">Rank</span>
          <span className="title-col">Title</span>
          <span className="metric-col">StdDev</span>
          <span className="metric-col">Mean</span>
          <span className="metric-col">Ratings</span>
        </div>
        <ul className="list">
          {data.map((anime, index) => {
            const stddev = Number(anime.stddev_score);
            const mean = Number(anime.mean_score);
            return (
              <li key={anime.anime_id} className="volatile-row">
                <span className="rank-col">{index + 1}</span>
                <span className="title-col">{anime.title}</span>
                <span className="metric-col">{Number.isFinite(stddev) ? stddev.toFixed(2) : "N/A"}</span>
                <span className="metric-col">{Number.isFinite(mean) ? mean.toFixed(2) : "N/A"}</span>
                <span className="metric-col">{anime.rating_count.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type SequelStats = {
  comparisons: number;
  avg_diff: number;
  median_diff: number;
  pct_later_higher: number;
};

function SequelStatsView({ data }: { data: SequelStats }) {
  const avgDiff = Number(data.avg_diff);
  const medianDiff = Number(data.median_diff);
  const pctLaterHigher = Number(data.pct_later_higher);
  
  return (
      <div className="grid four">
        <div className="stat-card">
          <p className="eyebrow">Comparisons</p>
          <p className="stat-value">{Number(data.comparisons).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">Avg Score Difference</p>
          <p className="stat-value">
            {Number.isFinite(avgDiff) ? (
              <>
                {avgDiff > 0 ? "+" : ""}
                {avgDiff.toFixed(3)}
              </>
            ) : "N/A"}
          </p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">Median Score Difference</p>
          <p className="stat-value">
            {Number.isFinite(medianDiff) ? (
              <>
                {medianDiff > 0 ? "+" : ""}
                {medianDiff.toFixed(3)}
              </>
            ) : "N/A"}
          </p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">% Sequels Better</p>
          <p className="stat-value">
            {Number.isFinite(pctLaterHigher) ? (pctLaterHigher * 100).toFixed(1) : "N/A"}%
          </p>
        </div>
      </div>
  );
}

type Genre = {
  genre_id: number;
  name: string;
};

type SearchAnime = {
  anime_id: number;
  title: string;
  score: number | null;
};

type RecommendedAnime = {
  anime_id: number;
  title: string;
  score: number | null;
  votes: number;
  num_episodes: number | null;
};

function RecommendPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchAnime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<SearchAnime | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedEra, setSelectedEra] = useState<string>("");
  const [excludeSequels, setExcludeSequels] = useState(false);
  const [highRatingOnly, setHighRatingOnly] = useState(false);
  const [shortSeriesOnly, setShortSeriesOnly] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendedAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch genres on mount
  useEffect(() => {
    fetch("/api/genres")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGenres(data);
        }
      })
      .catch(() => {});
  }, []);

  // Search anime as user types
  useEffect(() => {
    if (searchQuery.length < 2 || selectedAnime) {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setSearching(true);
      fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSearchResults(data);
            setShowDropdown(data.length > 0);
          }
        })
        .catch((err) => {
          console.error("Search error:", err);
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedAnime]);

  const handleSelectAnime = (anime: SearchAnime) => {
    setSelectedAnime(anime);
    setSearchQuery(anime.title);
    setShowDropdown(false);
  };

  const handleGetRecommendations = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAnime) {
      setError("Please select an anime from the dropdown first");
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    const params = new URLSearchParams();
    params.set("limit", "20"); // Fetch more to allow for client-side filtering

    if (selectedGenre) {
      params.set("genre_ids", selectedGenre);
    }

    if (highRatingOnly) {
      params.set("min_score", "8");
    }

    const url = `/api/anime/${selectedAnime.anime_id}/recommendations?${params.toString()}`;
    console.log("Fetching recommendations:", url);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Recommendations response:", data);
        if (Array.isArray(data)) {
          let results = data as RecommendedAnime[];

          if (shortSeriesOnly) {
            results = results.filter(
              (a) => a.num_episodes != null && Number(a.num_episodes) <= 13
            );
          }

          // Exclude sequels by title patterns
          if (excludeSequels) {
            results = results.filter(
              (a) =>
                !/(season\s*[2-9]|part\s*[2-9]|\s+2nd|\s+3rd|\s+II|:\s*[2-9])/i.test(
                  a.title
                )
            );
          }

          const finalResults = results.slice(0, 5);
          setRecommendations(finalResults);

          if (finalResults.length === 0) {
            if (data.length === 0) {
              setError("No recommendations found for this anime. Try a different title.");
            } else {
              setError("No recommendations match your filters. Try adjusting your criteria.");
            }
          }
        } else {
          throw new Error("Invalid response format");
        }
      })
      .catch((err) => {
        console.error("Recommendations error:", err);
        setError("Failed to get recommendations. Make sure the backend is running.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Recommendations</p>
          <h1>Find similar anime</h1>
          <p className="subtitle">Pick a title and add filters to tailor results.</p>
        </div>
      </header>

      <form className="card recommend-form" onSubmit={handleGetRecommendations}>
        <div className="input-row">
          <div className="search-container">
            <input
              type="text"
              placeholder="Type an anime title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedAnime(null);
              }}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && searchResults.length > 0 && (
              <ul className="search-dropdown">
                {searchResults.map((anime) => (
                  <li
                    key={anime.anime_id}
                    onMouseDown={() => handleSelectAnime(anime)}
                  >
                    <span className="dropdown-title">{anime.title}</span>
                    {anime.score && (
                      <span className="dropdown-score">
                        {Number(anime.score).toFixed(1)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {searching && <span className="search-spinner">...</span>}
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">Any genre</option>
            {genres.map((g) => (
              <option key={g.genre_id} value={g.genre_id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedEra}
            onChange={(e) => setSelectedEra(e.target.value)}
          >
            <option value="">Any era</option>
            <option value="2020">2020s</option>
            <option value="2010">2010s</option>
            <option value="2000">2000s</option>
            <option value="1990">1990s</option>
          </select>
        </div>

        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={excludeSequels}
              onChange={(e) => setExcludeSequels(e.target.checked)}
            />
            Exclude sequels
          </label>
          <label>
            <input
              type="checkbox"
              checked={highRatingOnly}
              onChange={(e) => setHighRatingOnly(e.target.checked)}
            />
            High rating only (8+)
          </label>
          <label>
            <input
              type="checkbox"
              checked={shortSeriesOnly}
              onChange={(e) => setShortSeriesOnly(e.target.checked)}
            />
            Short series (≤13 eps)
          </label>
        </div>

        <button type="submit" disabled={loading || !selectedAnime}>
          {loading ? "Loading..." : "Get recommendations"}
        </button>
      </form>

      {error && <div className="callout">{error}</div>}

      {selectedAnime && (
        <div className="selected-anime-card">
          <span className="selected-label">Selected:</span>
          <span className="selected-title">{selectedAnime.title}</span>
          {selectedAnime.score && (
            <span className="selected-score">
              {Number(selectedAnime.score).toFixed(1)}
            </span>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-title">
          {recommendations.length > 0 ? "Recommended for you" : "Suggested picks"}
        </div>
        {loading ? (
          <div className="pill">Finding recommendations...</div>
        ) : (
          <ul className="list">
            {(recommendations.length > 0
              ? recommendations
              : fallbackTopLists.rating.slice(0, 5).map((a) => ({
                  anime_id: a.anime_id,
                  title: a.title,
                  score: a.metric,
                  votes: 0,
                  num_episodes: null,
                }))
            ).map((anime, index) => (
              <li key={anime.anime_id} className="recommend-row">
                <span className="recommend-rank">{index + 1}</span>
                <span className="recommend-title">{anime.title}</span>
                <span className="recommend-score">
                  {anime.score != null ? Number(anime.score).toFixed(1) : "N/A"}
                </span>
                {anime.votes > 0 && (
                  <span className="recommend-votes">
                    {anime.votes} votes
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function GamePage() {
  const [animeA, setAnimeA] = useState<GameAnime | null>(null);
  const [animeB, setAnimeB] = useState<GameAnime | null>(null);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChoice, setLastChoice] = useState<"correct" | "wrong" | null>(null);

  const fetchNewPair = () => {
    setLoading(true);
    setError(null);
    setLastChoice(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch("/api/anime/compare/random-pair", { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data.A && data.B && data.A.score != null && data.B.score != null) {
          setAnimeA(data.A);
          setAnimeB(data.B);
          setGameState("playing");
          setLoading(false);
        } else {
          throw new Error("Invalid data from API");
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error("Game fetch error:", err);
        setError("Failed to load anime pair. Make sure the backend is running.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNewPair();
  }, []);

  const handleChoice = (choice: "A" | "B") => {
    if (gameState !== "playing" || !animeA || !animeB) return;

    const scoreA = animeA.score ?? 0;
    const scoreB = animeB.score ?? 0;

    const isCorrect =
      (choice === "A" && scoreA >= scoreB) ||
      (choice === "B" && scoreB >= scoreA);

    setLastChoice(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setGameState("revealed");
      setScore((s) => s + 1);
      // Auto-advance after showing the result
      setTimeout(() => {
        fetchNewPair();
      }, 1500);
    } else {
      setGameState("gameover");
    }
  };

  const handlePlayAgain = () => {
    setScore(0);
    fetchNewPair();
  };

  if (loading) {
    return (
      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Higher or Lower</p>
            <h1>Which anime has a higher score?</h1>
          </div>
        </header>
        <div className="game-loading">
          <div className="pill">Loading anime...</div>
        </div>
      </section>
    );
  }

  if (error || !animeA || !animeB) {
    return (
      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Higher or Lower</p>
            <h1>Which anime has a higher score?</h1>
          </div>
        </header>
        <div className="callout">{error || "Failed to load anime pair. Please try again."}</div>
        <button type="button" onClick={fetchNewPair}>
          Try Again
        </button>
      </section>
    );
  }

  if (gameState === "gameover") {
    return (
      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Game Over</p>
            <h1>You Lose!</h1>
            <p className="subtitle">Better luck next time.</p>
          </div>
        </header>

        <div className="game-over-container">
          <div className="game-over-card">
            <p className="game-over-label">Final Score</p>
            <p className="game-over-score">{score}</p>
            <p className="game-over-subtitle">
              {score === 0
                ? "Oops! Try again?"
                : score < 5
                ? "Not bad!"
                : score < 10
                ? "Great job!"
                : "Amazing!"}
            </p>
          </div>

          <div className="game-result-reveal">
            <div className="game-reveal-card">
              <p className="game-reveal-title">{animeA?.title}</p>
              <p className="game-reveal-score">{Number(animeA?.score).toFixed(2)}</p>
            </div>
            <span className="game-vs">vs</span>
            <div className="game-reveal-card">
              <p className="game-reveal-title">{animeB?.title}</p>
              <p className="game-reveal-score">{Number(animeB?.score).toFixed(2)}</p>
            </div>
          </div>

          <button type="button" onClick={handlePlayAgain}>
            Play Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Higher or Lower</p>
          <h1>Which anime has a higher score?</h1>
          <p className="subtitle">Click on the anime you think has the higher MAL rating.</p>
        </div>
        <div className="game-score-display">
          <span className="game-score-label">Score</span>
          <span className="game-score-value">{score}</span>
        </div>
      </header>

      {lastChoice === "correct" && (
        <div className="game-feedback correct">Correct! +1 point</div>
      )}

      <div className="game-container">
        <button
          type="button"
          className={`game-card ${gameState === "revealed" ? "revealed" : ""}`}
          onClick={() => handleChoice("A")}
          disabled={gameState !== "playing"}
        >
          <div className="game-card-content">
            <h2 className="game-card-title">{animeA?.title}</h2>
            {gameState === "revealed" && (
              <div className="game-card-score">
                <span className="game-score-number">{Number(animeA?.score).toFixed(2)}</span>
              </div>
            )}
            {gameState === "playing" && (
              <div className="game-card-prompt">Click to choose</div>
            )}
          </div>
        </button>

        <div className="game-vs-divider">
          <span>VS</span>
        </div>

        <button
          type="button"
          className={`game-card ${gameState === "revealed" ? "revealed" : ""}`}
          onClick={() => handleChoice("B")}
          disabled={gameState !== "playing"}
        >
          <div className="game-card-content">
            <h2 className="game-card-title">{animeB?.title}</h2>
            {gameState === "revealed" && (
              <div className="game-card-score">
                <span className="game-score-number">{Number(animeB?.score).toFixed(2)}</span>
              </div>
            )}
            {gameState === "playing" && (
              <div className="game-card-prompt">Click to choose</div>
            )}
          </div>
        </button>
      </div>
    </section>
  );
}



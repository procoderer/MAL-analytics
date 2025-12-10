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
  id: string;
  title: string;
  rating?: number;
  popularity?: number;
  favorites?: number;
};

const gamePairs: GameAnime[][] = [
  [
    { id: "g1", title: "Demon Slayer", rating: 8.5, popularity: 7 },
    { id: "g2", title: "Attack on Titan", rating: 9.0, popularity: 1 },
  ],
  [
    { id: "g3", title: "Naruto", rating: 7.9, popularity: 5 },
    { id: "g4", title: "Bleach", rating: 8.1, popularity: 6 },
  ],
];

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
        <div className="brand">MAL Analytics</div>
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
        <SearchFilters />
      </header>

      {error ? <div className="callout">{error}</div> : null}
      {loading ? <div className="pill">Loading live data…</div> : null}

      <div className="grid three">
        <TopList title="Top 10 rated" items={topLists.rating} metricName="rating" />
        <TopList title="Top 10 popular" items={topLists.popularity} metricName="popularity" />
        <TopList title="Top 10 favorited" items={topLists.favorites} metricName="favorites" />
      </div>
    </section>
  );
}

function SearchFilters() {
  return (
    <form className="search-card" onSubmit={(e) => e.preventDefault()}>
      <label className="label">Anime search</label>
      <div className="input-row">
        <input type="text" placeholder="Search title" />
        <select>
          <option>Any genre</option>
          <option>Action</option>
          <option>Drama</option>
          <option>Fantasy</option>
          <option>Slice of Life</option>
        </select>
      </div>
      <div className="input-row">
        <select>
          <option>Any year</option>
          <option>2025</option>
          <option>2024</option>
          <option>2023</option>
          <option>2022</option>
        </select>
        <select>
          <option>Any format</option>
          <option>TV</option>
          <option>Movie</option>
          <option>OVA/ONA</option>
        </select>
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
        {items.map((anime) => (
          <li key={anime.anime_id}>
            <span>{anime.title}</span>
            {anime.metric != null ? <span className="metric">{metricLabel(metricName, anime.metric)}</span> : null}
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

  const ranked = useMemo(
    () =>
      fallbackTopLists[metric]
        .filter((anime) => anime.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const av = a.metric ?? 0;
          const bv = b.metric ?? 0;
          return metric === "popularity" ? av - bv : bv - av;
        }),
    [query, metric]
  );

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

      <div className="card">
        <div className="card-title">Results</div>
        <ul className="list">
          {ranked.map((anime, index) => (
            <li key={anime.anime_id} className="list-row">
              <span className="rank">{index + 1}</span>
              <span>{anime.title}</span>
              <span className="metric">{metricLabel(metric, anime.metric)}</span>
            </li>
          ))}
        </ul>
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

function RecommendPage() {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Recommendations</p>
          <h1>Find similar anime</h1>
          <p className="subtitle">Pick a title and add filters to tailor results.</p>
        </div>
      </header>

      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <div className="input-row">
          <input placeholder="Type an anime title" />
          <select>
            <option>Any genre</option>
            <option>Action</option>
            <option>Drama</option>
            <option>Romance</option>
          </select>
          <select>
            <option>Any era</option>
            <option>2020s</option>
            <option>2010s</option>
            <option>2000s</option>
          </select>
        </div>
        <div className="checkbox-row">
          <label><input type="checkbox" /> Exclude sequels</label>
          <label><input type="checkbox" /> High rating only</label>
          <label><input type="checkbox" /> Short series</label>
        </div>
        <button type="submit">Get recommendations</button>
      </form>

      <div className="card">
        <div className="card-title">Suggested picks</div>
        <ul className="list">
          {fallbackTopLists.rating.slice(0, 5).map((anime) => (
            <li key={anime.anime_id} className="list-row">
              <span>{anime.title}</span>
              <span className="metric">{metricLabel("rating", anime.metric)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GamePage() {
  const [factor, setFactor] = useState<RankingMetric>("rating");
  const [round, setRound] = useState(0);
  const pair = gamePairs[round % gamePairs.length];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Guessing Game</p>
          <h1>Which anime wins?</h1>
          <p className="subtitle">Choose the metric and make your guess.</p>
        </div>
        <select value={factor} onChange={(e) => setFactor(e.target.value as typeof factor)}>
          <option value="rating">Rating</option>
          <option value="popularity">Popularity</option>
          <option value="favorites">Favoritism</option>
        </select>
      </header>

      <div className="grid two game-grid">
        {pair.map((anime) => (
          <div key={anime.id} className="card">
            <div className="card-title">{anime.title}</div>
            <p className="metric">{metricLabel(factor, anime[factor] ?? null)}</p>
            <button type="button">This one</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setRound((r) => r + 1)} className="secondary">
        Next matchup
      </button>
    </section>
  );
}



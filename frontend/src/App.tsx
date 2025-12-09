import React, { useEffect, useMemo, useState } from "react";

// Matches TopAnime shape from the API doc: anime_id, title, metric
type TopAnime = {
  anime_id: number;
  title: string;
  metric: number | null;
};

type TopLists = {
  rating: TopAnime[];
  popularity: TopAnime[];
  favorites: TopAnime[];
};

const fallbackTopLists: TopLists = {
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
  score?: number;
  popularity?: number;
  favorites?: number;
};

const gamePairs: GameAnime[][] = [
  [
    { id: "g1", title: "Demon Slayer", score: 8.5, popularity: 7 },
    { id: "g2", title: "Attack on Titan", score: 9.0, popularity: 1 },
  ],
  [
    { id: "g3", title: "Naruto", score: 7.9, popularity: 5 },
    { id: "g4", title: "Bleach", score: 8.1, popularity: 6 },
  ],
];

const tabs = ["Home", "Ranking", "Analytics", "Recommend", "Game"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [topLists, setTopLists] = useState<TopLists>(fallbackTopLists);
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

function normalizeTopLists(data: unknown): TopLists {
  // Preferred shape per api.md: { rating: TopAnime[], popularity: TopAnime[], favorites: TopAnime[] }
  if (
    data &&
    typeof data === "object" &&
    "rating" in data &&
    "popularity" in data &&
    "favorites" in data
  ) {
    const obj = data as { rating: TopAnime[]; popularity: TopAnime[]; favorites: TopAnime[] };
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
    const grouped: TopLists = { rating: [], popularity: [], favorites: [] };
    data.forEach((row: any) => {
      const list = row?.list;
      if (list === "rating" || list === "popularity" || list === "favorites") {
        const key: keyof TopLists = list;
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

function HomePage({ topLists, loading, error }: { topLists: TopLists; loading: boolean; error: string | null }) {
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
        <TopList title="Top 10 rated" items={topLists.rating} metricName="score" />
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

function TopList({ title, items, metricName }: { title: string; items: TopAnime[]; metricName: "score" | "popularity" | "favorites" }) {
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

function metricLabel(metric: "score" | "popularity" | "favorites", value: number | null) {
  if (value === null || typeof value !== "number" || Number.isNaN(value)) return "";
  if (metric === "score") return value.toFixed(1);
  if (metric === "favorites") return value.toLocaleString();
  return `#${value}`;
}

function RankingPage() {
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<"score" | "popularity" | "favorites">("score");

  const ranked = useMemo(
    () =>
      fallbackTopLists[metric === "score" ? "rating" : metric === "popularity" ? "popularity" : "favorites"]
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
            <option value="score">Rating</option>
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
    { label: "Avg favorites (top 500)", value: "820k" },
  ];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Interesting patterns</h1>
          <p className="subtitle">Quick highlights from the dataset.</p>
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
    </section>
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
              <span className="metric">{metricLabel("score", anime.metric)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GamePage() {
  const [factor, setFactor] = useState<"score" | "popularity" | "favorites">("score");
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
          <option value="score">Rating</option>
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



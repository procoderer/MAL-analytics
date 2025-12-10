import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg2.extras import RealDictCursor


DB_CONFIG = {
    "host": "cis550-anime-db.cbsgmwke4q2v.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "anime_db",
    "user": "student",
    "password": "Thisiswhyweclash123!",
}


def get_conn():
    return psycopg2.connect(cursor_factory=RealDictCursor, **DB_CONFIG)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    # Route 1 – Search Anime with Filters
    @app.get("/api/anime")
    def search_anime():
        # Accepts: season, type, source_type, min_score, max_score, genre_ids, limit
        # Return: JSON Array of Anime objects
        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError("limit must be positive")
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400

        season = request.args.get("season")
        anime_type = request.args.get("type")
        source_type = request.args.get("source_type")

        def _get_float_arg(name: str):
            if name not in request.args:
                return None
            try:
                return float(request.args.get(name))
            except (TypeError, ValueError):
                return None

        min_score = _get_float_arg("min_score")
        max_score = _get_float_arg("max_score")

        raw_genre_ids = request.args.getlist("genre_ids")
        genre_ids = None
        if raw_genre_ids:
            # Allow comma-separated list or repeated query params
            parts = []
            for item in raw_genre_ids:
                parts.extend(item.split(","))
            try:
                genre_ids = [int(gid) for gid in parts if str(gid).strip() != ""]
            except ValueError:
                return jsonify({"error": "genre_ids must be integers"}), 400
            if not genre_ids:
                genre_ids = None

        query = """
        SELECT a.*
        FROM anime a
        LEFT JOIN anime_genre ag ON ag.anime_id = a.anime_id
        WHERE
          (%(season)s IS NULL OR a.season = %(season)s) AND
          (%(type)s IS NULL OR a.type = %(type)s) AND
          (%(source_type)s IS NULL OR a.source_type = %(source_type)s) AND
          (%(min_score)s IS NULL OR a.score >= %(min_score)s) AND
          (%(max_score)s IS NULL OR a.score <= %(max_score)s)
        GROUP BY a.anime_id
        HAVING
          (%(genre_ids)s IS NULL OR COUNT(DISTINCT CASE WHEN ag.genre_id = ANY(%(genre_ids)s) THEN ag.genre_id END) = COALESCE(cardinality(%(genre_ids)s),0))
        ORDER BY a.score DESC NULLS LAST, a.members_count DESC NULLS LAST
        LIMIT %(limit)s;
        """

        params = {
            "season": season,
            "type": anime_type,
            "source_type": source_type,
            "min_score": min_score,
            "max_score": max_score,
            "genre_ids": genre_ids,
            "limit": limit,
        }

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 1b – Search Anime by Title
    @app.get("/api/anime/search")
    def search_anime_by_title():
        query_str = request.args.get("q", "").strip()
        if len(query_str) < 2:
            return jsonify([])

        limit = request.args.get("limit", "10")
        try:
            limit = int(limit)
            if limit <= 0 or limit > 50:
                limit = 10
        except ValueError:
            limit = 10

        query = """
        SELECT a.anime_id, a.title, a.score, a.num_episodes
        FROM anime a
        WHERE LOWER(a.title) LIKE LOWER(%(pattern)s)
        ORDER BY
          CASE WHEN LOWER(a.title) LIKE LOWER(%(starts_with)s) THEN 0 ELSE 1 END,
          a.members_count DESC NULLS LAST
        LIMIT %(limit)s;
        """

        params = {
            "pattern": f"%{query_str}%",
            "starts_with": f"{query_str}%",
            "limit": limit,
        }

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 2 – Top Lists by Rating, Popularity, and Favorites
    @app.get("/api/anime/top-lists")
    def top_lists():
        query = """
        (
          SELECT 'rating' AS list, a.anime_id, a.title, a.score AS metric
          FROM anime a
          WHERE a.score IS NOT NULL
          ORDER BY a.score DESC
          LIMIT 10
        )
        UNION ALL
        (
          SELECT 'popularity' AS list, a.anime_id, a.title, a.members_count AS metric
          FROM anime a
          ORDER BY a.members_count DESC NULLS LAST
          LIMIT 10
        )
        UNION ALL
        (
          SELECT 'favorites' AS list, a.anime_id, a.title, a.favorites_count AS metric
          FROM anime a
          ORDER BY a.favorites_count DESC NULLS LAST
          LIMIT 10
        )
        ORDER BY list, metric DESC NULLS LAST;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 3 – Top Anime by a Chosen Metric
    @app.get("/api/anime/top")
    def top_anime():
        metric = request.args.get("metric")
        metric_map = {
            "rating": "score",
            "popularity": "members_count",
            "favorites": "favorites_count",
        }
        if metric not in metric_map:
            return jsonify({"error": "metric must be one of: rating, popularity, favorites"}), 400

        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError()
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400

        query = """
        SELECT a.anime_id, a.title, a.score, a.favorites_count, a.members_count
        FROM anime a
        ORDER BY
          CASE %(metric)s
            WHEN 'rating' THEN a.score
            WHEN 'popularity' THEN a.members_count::decimal
            WHEN 'favorites' THEN a.favorites_count::decimal
          END DESC NULLS LAST,
          a.members_count DESC NULLS LAST
        LIMIT %(limit)s;
        """
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"metric": metric, "limit": limit})
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 4 – Recommendations from Recommendation Table + Filters
    @app.get("/api/anime/<int:seed_id>/recommendations")
    def recommendations(seed_id: int):
        # Accepts: min_score, limit
        try:
            limit = int(request.args.get("limit", 10))
            if limit <= 0:
                limit = 10
        except ValueError:
            limit = 10

        min_score = None
        if "min_score" in request.args:
            try:
                min_score = float(request.args.get("min_score"))
            except (TypeError, ValueError):
                pass

        # Simplified query - just get recommendations without complex filtering
        query = """
        WITH recs AS (
          SELECT
            CASE
              WHEN r.anime_id_a = %(seed_id)s THEN r.anime_id_b
              ELSE r.anime_id_a
            END AS rec_id,
            MAX(r.num_recommenders) AS votes
          FROM recommendation r
          WHERE r.anime_id_a = %(seed_id)s OR r.anime_id_b = %(seed_id)s
          GROUP BY rec_id
        )
        SELECT a.anime_id, a.title, a.score, a.num_episodes, recs.votes
        FROM recs
        JOIN anime a ON a.anime_id = recs.rec_id
        WHERE (%(min_score)s IS NULL OR a.score >= %(min_score)s)
        ORDER BY recs.votes DESC, a.score DESC NULLS LAST
        LIMIT %(limit)s;
        """

        params = {
            "seed_id": seed_id,
            "min_score": min_score,
            "limit": limit,
        }

        try:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                return jsonify(rows)
        except Exception as e:
            print(f"Recommendations error: {e}")
            return jsonify({"error": str(e)}), 500

    # Route 5 – Similar Anime by Overlapping Genres and Studios
    @app.get("/api/anime/<int:seed_id>/similar")
    def similar(seed_id: int):
        # Accepts: limit
        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError()
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400

        query = """
        WITH seed_g AS (
          SELECT genre_id FROM anime_genre WHERE anime_id = %(seed_id)s
        ),
        seed_s AS (
          SELECT studio_id FROM anime_studio WHERE anime_id = %(seed_id)s
        ),
        cand AS (
          SELECT a.anime_id, a.title
          FROM anime a
          WHERE a.anime_id <> %(seed_id)s
        ),
        overlap_stats AS (
          SELECT c.anime_id,
                 COUNT(DISTINCT ag.genre_id) FILTER (WHERE ag.genre_id IN (SELECT genre_id FROM seed_g)) AS g_overlap,
                 COUNT(DISTINCT ast.studio_id) FILTER (WHERE ast.studio_id IN (SELECT studio_id FROM seed_s)) AS s_overlap,
                 COUNT(DISTINCT ag.genre_id) AS g_total_c,
                 (SELECT COUNT(*) FROM seed_g) AS g_total_s,
                 COUNT(DISTINCT ast.studio_id) AS s_total_c,
                 (SELECT COUNT(*) FROM seed_s) AS s_total_s
          FROM cand c
          LEFT JOIN anime_genre ag ON ag.anime_id = c.anime_id
          LEFT JOIN anime_studio ast ON ast.anime_id = c.anime_id
          GROUP BY c.anime_id
        )
        SELECT a.anime_id, a.title,
               a.score, a.favorites_count, a.members_count,
               (CASE WHEN (g_total_c + g_total_s - g_overlap) > 0
                     THEN g_overlap::decimal / NULLIF((g_total_c + g_total_s - g_overlap),0) ELSE 0 END) * 0.7
             + (CASE WHEN (s_total_c + s_total_s - s_overlap) > 0
                     THEN s_overlap::decimal / NULLIF((s_total_c + s_total_s - s_overlap),0) ELSE 0 END) * 0.3
               AS similarity
        FROM overlap_stats o
        JOIN anime a ON a.anime_id = o.anime_id
        WHERE o.g_overlap > 0 OR o.s_overlap > 0
        ORDER BY similarity DESC, a.score DESC NULLS LAST, a.members_count DESC NULLS LAST
        LIMIT %(limit)s;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"seed_id": seed_id, "limit": limit})
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 6 – Top Rated Anime Ignoring Scores of 1
    @app.get("/api/anime/top/adjusted-score")
    def top_adjusted_score():
        # Accepts: limit
        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError()
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400

        query = """
        WITH hist AS (
          SELECT
            a.anime_id,
            a.title,
            a.score AS original_score,
            a.members_count,
            (a.score_2_count + a.score_3_count + a.score_4_count + a.score_5_count +
             a.score_6_count + a.score_7_count + a.score_8_count + a.score_9_count +
             a.score_10_count) AS n_no1,
            (2 * a.score_2_count + 3 * a.score_3_count + 4 * a.score_4_count +
             5 * a.score_5_count + 6 * a.score_6_count + 7 * a.score_7_count +
             8 * a.score_8_count + 9 * a.score_9_count + 10 * a.score_10_count
            )::numeric AS sumx_no1
          FROM anime a
        ),
        scored AS (
          SELECT
            anime_id,
            title,
            original_score,
            members_count,
            n_no1,
            (sumx_no1 / NULLIF(n_no1, 0))::numeric(4,2) AS adjusted_score,
            ( (sumx_no1 / NULLIF(n_no1, 0)) - NULLIF(original_score::numeric, NULL) )::numeric(4,2) AS delta_vs_original
          FROM hist
          WHERE n_no1 >= 100
        )
        SELECT anime_id, title,
               adjusted_score,
               original_score,
               delta_vs_original,
               n_no1 AS remaining_ratings,
               members_count
        FROM scored
        WHERE adjusted_score IS NOT NULL
        ORDER BY adjusted_score DESC, remaining_ratings DESC, members_count DESC NULLS LAST
        LIMIT %(limit)s;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"limit": limit})
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 7 – Rank Years by Average Rating
    @app.get("/api/stats/years/ratings")
    def stats_years_ratings():
        query = """
        WITH with_year AS (
          SELECT
            NULLIF(substring(a.season FROM '\\d{4}'), '')::int AS year,
            a.score,
            (a.score_1_count + a.score_2_count + a.score_3_count + a.score_4_count +
             a.score_5_count + a.score_6_count + a.score_7_count + a.score_8_count +
             a.score_9_count + a.score_10_count) AS rating_count
          FROM anime a
          WHERE a.score IS NOT NULL
        ),
        by_year AS (
          SELECT
            year,
            COUNT(*) AS n_titles,
            SUM(rating_count) AS total_ratings,
            AVG(score)::numeric(4,2) AS avg_score
          FROM with_year
          WHERE year IS NOT NULL
          GROUP BY year
        ),
        ranked AS (
          SELECT
            year, n_titles, total_ratings, avg_score,
            DENSE_RANK() OVER (ORDER BY avg_score DESC NULLS LAST) AS rank_by_avg
          FROM by_year
        )
        SELECT year, n_titles, total_ratings, avg_score, rank_by_avg
        FROM ranked
        ORDER BY rank_by_avg, year;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 8 – Episodes vs Rating/Favorites/Popularity Stats
    @app.get("/api/stats/episodes-vs-metrics")
    def stats_episodes_vs_metrics():
        query = """
        WITH base AS (
          SELECT num_episodes, score, favorites_count, members_count
          FROM anime
          WHERE num_episodes IS NOT NULL AND num_episodes > 0
        ),
        bins AS (
          SELECT
            width_bucket(num_episodes, 1, 100, 10) AS bucket,
            MIN(num_episodes) AS min_eps,
            MAX(num_episodes) AS max_eps,
            COUNT(*) AS n,
            AVG(score) AS avg_score,
            AVG(favorites_count) AS avg_favorites,
            AVG(members_count) AS avg_members
          FROM base
          GROUP BY width_bucket(num_episodes, 1, 100, 10)
        )
        SELECT b.*,
          (SELECT corr(num_episodes::float, score::float) FROM base) AS corr_eps_score,
          (SELECT corr(num_episodes::float, favorites_count::float) FROM base) AS corr_eps_favorites,
          (SELECT corr(num_episodes::float, members_count::float) FROM base) AS corr_eps_members
        FROM bins b
        ORDER BY bucket;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

            if not rows:
                return jsonify({
                    "bins": [],
                    "corr_eps_score": None,
                    "corr_eps_favorites": None,
                    "corr_eps_members": None
                })

            # Correlation values are repeated per row; take from first row and strip keys from bins.
            corr_eps_score = rows[0].get("corr_eps_score")
            corr_eps_favorites = rows[0].get("corr_eps_favorites")
            corr_eps_members = rows[0].get("corr_eps_members")

            bins = []
            for row in rows:
                bins.append({
                    "bucket": row.get("bucket"),
                    "min_eps": row.get("min_eps"),
                    "max_eps": row.get("max_eps"),
                    "n": row.get("n"),
                    "avg_score": row.get("avg_score"),
                    "avg_favorites": row.get("avg_favorites"),
                    "avg_members": row.get("avg_members"),
                })

            return jsonify({
                "bins": bins,
                "corr_eps_score": corr_eps_score,
                "corr_eps_favorites": corr_eps_favorites,
                "corr_eps_members": corr_eps_members,
            })

    # Route 9 – Random Pair of Comparable Anime
    @app.get("/api/anime/compare/random-pair")
    def compare_random_pair():
        query = """
        WITH pool AS (
          SELECT a.anime_id, a.title, a.score, a.members_count, a.favorites_count
          FROM anime a
          WHERE a.members_count >= 10000
            AND a.score IS NOT NULL
            AND a.favorites_count IS NOT NULL
        ),
        anchor AS (
          SELECT p.* FROM pool p
          ORDER BY random()
          LIMIT 1
        ),
        challenger AS (
          SELECT p.*
          FROM pool p, anchor a
          WHERE p.anime_id <> a.anime_id
            AND p.score <> a.score
            AND p.members_count <> a.members_count
            AND p.favorites_count<> a.favorites_count
          ORDER BY random()
          LIMIT 1
        )
        SELECT 'A' AS slot, * FROM anchor
        UNION ALL
        SELECT 'B' AS slot, * FROM challenger;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

            result = {"A": None, "B": None}
            for row in rows:
                slot = row.get("slot")
                if slot in ("A", "B"):
                    result[slot] = {
                        "anime_id": row.get("anime_id"),
                        "title": row.get("title"),
                        "score": row.get("score"),
                        "members_count": row.get("members_count"),
                        "favorites_count": row.get("favorites_count"),
                    }

            return jsonify(result)

    # Route 10 – Most Polarizing Anime (Stddev of Ratings)
    @app.get("/api/anime/ratings/volatile")
    def ratings_volatile():
        # Accepts: limit
        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError()
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400

        query = """
        WITH hist AS (
          SELECT
            a.anime_id, a.title,
            (a.score_1_count + a.score_2_count + a.score_3_count + a.score_4_count +
             a.score_5_count + a.score_6_count + a.score_7_count + a.score_8_count +
             a.score_9_count + a.score_10_count) AS n,
            (1 * a.score_1_count + 2 * a.score_2_count + 3 * a.score_3_count + 4 * a.score_4_count +
             5 * a.score_5_count + 6 * a.score_6_count + 7 * a.score_7_count + 8 * a.score_8_count +
             9 * a.score_9_count + 10 * a.score_10_count)::numeric AS sumx,
            ( 1 * a.score_1_count + 4 * a.score_2_count + 9 * a.score_3_count + 16 * a.score_4_count +
               25 * a.score_5_count + 36 * a.score_6_count + 49 * a.score_7_count + 64 * a.score_8_count +
               81 * a.score_9_count + 100 * a.score_10_count )::numeric AS sumx2
          FROM anime a
        ),
        stats AS (
          SELECT
            anime_id,
            title,
            n,
            (sumx / NULLIF(n, 0)) AS mean_score,
            sqrt( (sumx2 / NULLIF(n, 0)) - power(sumx / NULLIF(n, 0), 2) ) AS stddev_score
          FROM hist
          WHERE n >= 500
        )
        SELECT anime_id, title, n AS rating_count, mean_score, stddev_score
        FROM stats
        ORDER BY stddev_score DESC, rating_count DESC
        LIMIT %(limit)s;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"limit": limit})
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 11 – Sequel vs First-Season Score Stats
    @app.get("/api/stats/sequels-vs-first-season")
    def stats_sequels_vs_first_season():
        query = """
        WITH RECURSIVE
        edges AS (
          SELECT DISTINCT
                 ra.anime_id_a AS earlier_id,
                 ra.anime_id_b AS later_id
          FROM related_anime ra
          WHERE ra.relation_type::text ILIKE 'Sequel'
        ),
        roots AS (
          SELECT DISTINCT e.earlier_id AS root_id
          FROM edges e
          WHERE NOT EXISTS (SELECT 1 FROM edges x WHERE x.later_id = e.earlier_id)
        ),
        chain AS (
          SELECT r.root_id, r.root_id AS node_id, 0 AS depth, ARRAY[r.root_id] AS path
          FROM roots r
          UNION ALL
          SELECT c.root_id, e.later_id, c.depth + 1, c.path || e.later_id
          FROM chain c
          JOIN edges e ON e.earlier_id = c.node_id
        ),
        descendants AS (
          SELECT root_id, node_id, depth
          FROM chain
          WHERE depth > 0
        ),
        dedup AS (
          SELECT root_id, node_id, MIN(depth) AS depth
          FROM descendants
          GROUP BY root_id, node_id
        ),
        pairs AS (
          SELECT
            r.anime_id AS root_id,
            r.title AS root_title,
            r.score AS root_score,
            c.anime_id AS other_id,
            c.title AS other_title,
            c.score AS other_score,
            d.depth,
            (c.score - r.score) AS diff
          FROM dedup d
          JOIN anime r ON r.anime_id = d.root_id
          JOIN anime c ON c.anime_id = d.node_id
          WHERE r.score IS NOT NULL AND c.score IS NOT NULL
        )
        SELECT
          COUNT(*) AS comparisons,
          AVG(diff) AS avg_diff,
          PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY diff) AS median_diff,
          SUM((diff > 0)::int)::decimal / COUNT(*) AS pct_later_higher
        FROM pairs;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            row = cur.fetchone()
            if not row:
                return jsonify({
                    "comparisons": 0,
                    "avg_diff": None,
                    "median_diff": None,
                    "pct_later_higher": None,
                })
            return jsonify(row)

    # Route 12 – List All Genres
    @app.get("/api/genres")
    def list_genres():
        query = """
        SELECT g.genre_id, g.name
        FROM genre g
        ORDER BY g.name;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 13 – Get Anime by ID (full record)
    @app.get("/api/anime/<int:anime_id>")
    def get_anime(anime_id: int):
        query = "SELECT * FROM anime WHERE anime_id = %(id)s;"
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"id": anime_id})
            row = cur.fetchone()
            if row is None:
                return jsonify({"error": "anime not found"}), 404
            return jsonify(row)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5001, debug=True)



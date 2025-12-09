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

        column = metric_map[metric]
        query = f"""
        SELECT anime_id, title, score, favorites_count, members_count
        FROM anime
        ORDER BY {column} DESC NULLS LAST
        LIMIT %(limit)s;
        """
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(query, {"limit": limit})
            rows = cur.fetchall()
            return jsonify(rows)

    # Route 4 – Recommendations from Recommendation Table + Filters
    @app.get("/api/anime/<int:seed_id>/recommendations")
    def recommendations(seed_id: int):
        # Accepts: season, type, source_type, min_score, max_score, genre_ids, limit
        # TODO: implement recommendation logic
        try:
            limit = int(request.args["limit"])
            if limit <= 0:
                raise ValueError()
        except (KeyError, ValueError):
            return jsonify({"error": "limit is required and must be a positive integer"}), 400
        return jsonify([])

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
        # TODO: implement similarity logic
        return jsonify([])

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
        # TODO: implement adjusted score logic
        return jsonify([])

    # Route 7 – Rank Years by Average Rating
    @app.get("/api/stats/years/ratings")
    def stats_years_ratings():
        return jsonify([])

    # Route 8 – Episodes vs Rating/Favorites/Popularity Stats
    @app.get("/api/stats/episodes-vs-metrics")
    def stats_episodes_vs_metrics():
        return jsonify({
            "bins": [],
            "corr_eps_score": 0.0,
            "corr_eps_favorites": 0.0,
            "corr_eps_members": 0.0
        })

    # Route 9 – Random Pair of Comparable Anime
    @app.get("/api/anime/compare/random-pair")
    def compare_random_pair():
        return jsonify({
            "A": {
                "anime_id": None,
                "title": None,
                "score": None,
                "members_count": None,
                "favorites_count": None,
            },
            "B": {
                "anime_id": None,
                "title": None,
                "score": None,
                "members_count": None,
                "favorites_count": None,
            }
        })

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
        # TODO: implement volatility logic
        return jsonify([])

    # Route 11 – Sequel vs First-Season Score Stats
    @app.get("/api/stats/sequels-vs-first-season")
    def stats_sequels_vs_first_season():
        return jsonify({
            "comparisons": 0,
            "avg_diff": 0.0,
            "median_diff": 0.0,
            "pct_later_higher": 0.0
        })

    # Route 12 – List All Genres
    @app.get("/api/genres")
    def list_genres():
        return jsonify([])

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



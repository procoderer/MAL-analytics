from flask import Flask, jsonify, request
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    # Route 1 – Search Anime with Filters
    @app.get("/api/anime")
    def search_anime():
        # Accepts: season, type, source_type, min_score, max_score, genre_ids, limit
        # Return: JSON Array of Anime objects (stubbed)
        return jsonify([])

    # Route 2 – Top Lists by Rating, Popularity, and Favorites
    @app.get("/api/anime/top-lists")
    def top_lists():
        return jsonify({"rating": [], "popularity": [], "favorites": []})

    # Route 3 – Top Anime by a Chosen Metric
    @app.get("/api/anime/top")
    def top_anime():
        # Accepts: metric, limit
        return jsonify([])

    # Route 4 – Recommendations from Recommendation Table + Filters
    @app.get("/api/anime/<int:seed_id>/recommendations")
    def recommendations(seed_id: int):
        # Accepts: season, type, source_type, min_score, max_score, genre_ids, limit
        return jsonify([])

    # Route 5 – Similar Anime by Overlapping Genres and Studios
    @app.get("/api/anime/<int:seed_id>/similar")
    def similar(seed_id: int):
        # Accepts: limit
        return jsonify([])

    # Route 6 – Top Rated Anime Ignoring Scores of 1
    @app.get("/api/anime/top/adjusted-score")
    def top_adjusted_score():
        # Accepts: limit
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
            "A": {},
            "B": {}
        })

    # Route 10 – Most Polarizing Anime (Stddev of Ratings)
    @app.get("/api/anime/ratings/volatile")
    def ratings_volatile():
        # Accepts: limit
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

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5001, debug=True)



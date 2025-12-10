import os
import sys
from typing import Any, Dict, List, Optional

import pytest

# Ensure the backend package is importable when running tests from repo root.
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import app  # noqa: E402  pylint: disable=wrong-import-position


class FakeCursor:
    """Lightweight cursor stub that records executions and returns canned results."""

    def __init__(
        self,
        fetchall_result: Optional[List[Dict[str, Any]]] = None,
        fetchone_result: Optional[Dict[str, Any]] = None,
    ):
        self.fetchall_result = fetchall_result or []
        self.fetchone_result = fetchone_result
        self.executed: List[Dict[str, Any]] = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.executed.append({"query": query, "params": params})

    def fetchall(self):
        return list(self.fetchall_result)

    def fetchone(self):
        return self.fetchone_result


class FakeConn:
    """Minimal connection stub that works with context managers."""

    def __init__(self, cursor: FakeCursor):
        self.cursor_obj = cursor

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self.cursor_obj


@pytest.fixture
def client(monkeypatch):
    cursor = FakeCursor()
    conn = FakeConn(cursor)
    monkeypatch.setattr(app, "get_conn", lambda: conn)
    flask_app = app.create_app()
    flask_app.testing = True
    return flask_app.test_client(), cursor


def test_search_anime_requires_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime")
    assert resp.status_code == 400
    assert "limit" in resp.get_json().get("error", "")


def test_search_anime_validates_genre_ids(client):
    test_client, _ = client
    resp = test_client.get("/api/anime?limit=5&genre_ids=abc")
    assert resp.status_code == 400
    assert "genre_ids" in resp.get_json().get("error", "")


def test_search_anime_runs_query_with_params(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 1, "title": "Demo"}]

    resp = test_client.get(
        "/api/anime?limit=2&season=2020&genre_ids=1&genre_ids=2&type=TV&source_type=Manga&min_score=5.5&max_score=9.0"
    )
    assert resp.status_code == 200
    assert resp.get_json()[0]["title"] == "Demo"
    assert cursor.executed, "Expected search query to be executed"
    params = cursor.executed[0]["params"]
    assert params["limit"] == 2
    assert params["genre_ids"] == [1, 2]
    assert params["min_score"] == 5.5
    assert params["max_score"] == 9.0


def test_top_lists_returns_rows(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"list": "rating", "metric": 9.1}]
    resp = test_client.get("/api/anime/top-lists")
    assert resp.status_code == 200
    assert resp.get_json()[0]["list"] == "rating"


def test_top_anime_validates_metric(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/top?metric=unknown&limit=3")
    assert resp.status_code == 400
    assert "metric" in resp.get_json().get("error", "")


def test_top_anime_requires_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/top?metric=rating")
    assert resp.status_code == 400
    assert "limit" in resp.get_json().get("error", "")


def test_top_anime_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 1, "title": "Top"}]
    resp = test_client.get("/api/anime/top?metric=rating&limit=1")
    assert resp.status_code == 200
    assert resp.get_json()[0]["title"] == "Top"


def test_recommendations_validates_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/1/recommendations")
    # Limit defaults to 10; should return success with empty list when no rows
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_recommendations_validates_genre(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/1/recommendations?limit=5&genre_ids=bad")
    # genre_ids is currently ignored; request should still succeed
    assert resp.status_code == 200


def test_recommendations_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 2, "votes": 3}]
    resp = test_client.get("/api/anime/1/recommendations?limit=5")
    assert resp.status_code == 200
    assert resp.get_json()[0]["votes"] == 3


def test_similar_requires_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/1/similar")
    assert resp.status_code == 400
    assert "limit" in resp.get_json().get("error", "")


def test_similar_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 2, "similarity": 0.8}]
    resp = test_client.get("/api/anime/1/similar?limit=1")
    assert resp.status_code == 200
    assert resp.get_json()[0]["similarity"] == 0.8


def test_top_adjusted_score_validates_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/top/adjusted-score")
    assert resp.status_code == 400
    assert "limit" in resp.get_json().get("error", "")


def test_top_adjusted_score_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 1, "adjusted_score": 9.5}]
    resp = test_client.get("/api/anime/top/adjusted-score?limit=2")
    assert resp.status_code == 200
    assert resp.get_json()[0]["adjusted_score"] == 9.5


def test_stats_years_ratings_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"year": 2020, "avg_score": 8.0}]
    resp = test_client.get("/api/stats/years/ratings")
    assert resp.status_code == 200
    assert resp.get_json()[0]["year"] == 2020


def test_stats_episodes_vs_metrics_empty(client):
    test_client, cursor = client
    cursor.fetchall_result = []
    resp = test_client.get("/api/stats/episodes-vs-metrics")
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["bins"] == []
    assert body["corr_eps_score"] is None


def test_stats_episodes_vs_metrics_populated(client):
    test_client, cursor = client
    cursor.fetchall_result = [
        {
            "bucket": 1,
            "min_eps": 1,
            "max_eps": 10,
            "n": 5,
            "avg_score": 7.2,
            "avg_favorites": 50.0,
            "avg_members": 100.0,
            "corr_eps_score": 0.1,
            "corr_eps_favorites": 0.2,
            "corr_eps_members": 0.3,
        }
    ]
    resp = test_client.get("/api/stats/episodes-vs-metrics")
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["corr_eps_score"] == 0.1
    assert body["bins"][0]["bucket"] == 1
    assert "corr_eps_score" not in body["bins"][0]


def test_compare_random_pair_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [
        {"slot": "A", "anime_id": 1, "title": "A1", "score": 8.0, "members_count": 10, "favorites_count": 5},
        {"slot": "B", "anime_id": 2, "title": "B1", "score": 7.5, "members_count": 12, "favorites_count": 7},
    ]
    resp = test_client.get("/api/anime/compare/random-pair")
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["A"]["title"] == "A1"
    assert body["B"]["anime_id"] == 2


def test_search_title_too_short_returns_empty(client):
    test_client, cursor = client
    resp = test_client.get("/api/anime/search?q=a")
    assert resp.status_code == 200
    assert resp.get_json() == []
    # No DB call when query string is too short
    assert cursor.executed == []


def test_search_title_executes_with_params(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 1, "title": "Naruto"}]

    resp = test_client.get("/api/anime/search?q=nar&limit=5")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data[0]["title"] == "Naruto"

    assert cursor.executed, "Expected search query to execute"
    params = cursor.executed[0]["params"]
    assert params["limit"] == 5
    assert params["pattern"] == "%nar%"
    assert params["starts_with"] == "nar%"


def test_ratings_volatile_validates_limit(client):
    test_client, _ = client
    resp = test_client.get("/api/anime/ratings/volatile")
    assert resp.status_code == 400
    assert "limit" in resp.get_json().get("error", "")


def test_ratings_volatile_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"anime_id": 1, "stddev_score": 1.5}]
    resp = test_client.get("/api/anime/ratings/volatile?limit=3")
    assert resp.status_code == 200
    assert resp.get_json()[0]["stddev_score"] == 1.5


def test_stats_sequels_vs_first_season_empty(client):
    test_client, cursor = client
    cursor.fetchone_result = None
    resp = test_client.get("/api/stats/sequels-vs-first-season")
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["comparisons"] == 0
    assert body["avg_diff"] is None


def test_stats_sequels_vs_first_season_populated(client):
    test_client, cursor = client
    cursor.fetchone_result = {
        "comparisons": 3,
        "avg_diff": 0.5,
        "median_diff": 0.4,
        "pct_later_higher": 0.67,
    }
    resp = test_client.get("/api/stats/sequels-vs-first-season")
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["comparisons"] == 3
    assert body["pct_later_higher"] == 0.67


def test_list_genres_success(client):
    test_client, cursor = client
    cursor.fetchall_result = [{"name": "Action"}, {"name": "Drama"}]
    resp = test_client.get("/api/genres")
    data = resp.get_json()
    assert resp.status_code == 200
    assert data[0]["name"] == "Action"


def test_get_anime_not_found(client):
    test_client, cursor = client
    cursor.fetchone_result = None
    resp = test_client.get("/api/anime/99999")
    assert resp.status_code == 404
    assert resp.get_json()["error"] == "anime not found"


def test_get_anime_success(client):
    test_client, cursor = client
    cursor.fetchone_result = {"anime_id": 1, "title": "Found"}
    resp = test_client.get("/api/anime/1")
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "Found"


import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app


def test_api_search_caps_max_records_to_500(monkeypatch):
    captured = {}

    def fake_fetch(query_text, field, max_records, start_record, cql_override=""):
        captured["query_text"] = query_text
        captured["field"] = field
        captured["max_records"] = max_records
        captured["start_record"] = start_record
        captured["cql_override"] = cql_override
        return [], 1234, ""

    monkeypatch.setattr(app, "_fetch_sru_records", fake_fetch)

    with app.app.test_client() as client:
        response = client.get("/api/search?q=Rilke&field=author&maxRecords=1000&page=1")
    payload = response.get_json()

    assert response.status_code == 200
    assert captured["max_records"] == 500
    assert payload["limit"] == 500
    assert payload["totalPages"] == 3
    assert payload["total"] == 1234


def test_api_aggregates_caps_max_records_to_500(monkeypatch):
    captured = {}

    def fake_fetch(query_text, field, max_records, start_record, cql_override=""):
        captured["query_text"] = query_text
        captured["field"] = field
        captured["max_records"] = max_records
        captured["start_record"] = start_record
        captured["cql_override"] = cql_override
        return [], 1234, ""

    monkeypatch.setattr(app, "_fetch_sru_records", fake_fetch)

    with app.app.test_client() as client:
        response = client.get(
            "/api/aggregates?q=Rilke&field=author&maxRecords=1000&page=1"
        )
    payload = response.get_json()

    assert response.status_code == 200
    assert captured["max_records"] == 500
    assert payload["limit"] == 500
    assert payload["totalPages"] == 3
    assert payload["total"] == 1234

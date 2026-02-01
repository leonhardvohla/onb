from pathlib import Path


def test_frontend_url_params_and_default_query_present():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "URLSearchParams" in content
    assert "Grillparzer" in content
    assert "field = \"author\"" in content

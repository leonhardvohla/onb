from pathlib import Path


def test_frontend_url_params_and_default_query_present():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "URLSearchParams" in content
    assert "Grillparzer" in content
    assert "field = \"author\"" in content


def test_search_controls_share_height_and_select_style():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "height: 46px;" in content
    assert "appearance: none;" in content


def test_timeline_bar_width_is_thin():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "Math.min(2" in content

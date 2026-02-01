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


def test_search_controls_include_paging_and_shuffle():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "size" in content
    assert "page" in content


def test_page_dropdown_present():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "Page {{ p }}" in content
    assert "current - 5" in content
    assert "current + 5" in content


def test_sample_size_options_present():
    path = Path(__file__).resolve().parents[2] / "frontend" / "index.html"
    content = path.read_text(encoding="utf-8")
    assert "sizes: [50, 100, 500, 1000]" in content

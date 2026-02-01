import math
import os
import re
import time
from pathlib import Path
from xml.etree import ElementTree as ET

import requests
from flask import Flask, jsonify, make_response, request, send_from_directory

SRU_BASE_URL = "https://obv-at-oenb.alma.exlibrisgroup.com/view/sru/43ACC_ONB"
DEFAULT_MAX_RECORDS = 100
MAX_RECORDS_LIMIT = 1000
CACHE_TTL_SECONDS = 300

CACHE = {}

NS = {
    "marc": "http://www.loc.gov/MARC21/slim",
    "srw": "http://www.loc.gov/zing/srw/",
    "diag": "http://www.loc.gov/zing/srw/diagnostic/",
}

STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend"
app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.config["CORS_ALLOW_ORIGINS"] = os.getenv("CORS_ALLOW_ORIGINS", "")


def _cors_allowed_origins():
    raw = app.config.get("CORS_ALLOW_ORIGINS", "")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _origin_allowed(origin):
    if not origin:
        return False
    origins = _cors_allowed_origins()
    if not origins:
        return False
    if "*" in origins:
        return True
    return origin in origins


def _apply_cors(response):
    origin = request.headers.get("Origin")
    if not _origin_allowed(origin):
        return response
    origins = _cors_allowed_origins()
    allow_all = "*" in origins
    response.headers["Access-Control-Allow-Origin"] = "*" if allow_all else origin
    response.headers.setdefault("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.setdefault("Access-Control-Allow-Headers", "Content-Type")
    if not allow_all:
        vary = response.headers.get("Vary")
        if vary:
            values = [value.strip() for value in vary.split(",")]
            if "Origin" not in values:
                response.headers["Vary"] = f"{vary}, Origin"
        else:
            response.headers["Vary"] = "Origin"
    return response


@app.before_request
def _cors_preflight():
    if request.method != "OPTIONS":
        return None
    response = make_response("", 204)
    return _apply_cors(response)


@app.after_request
def _cors_headers(response):
    return _apply_cors(response)


def _now():
    return time.time()


def _cache_get(key):
    item = CACHE.get(key)
    if not item:
        return None
    if _now() - item["ts"] > CACHE_TTL_SECONDS:
        del CACHE[key]
        return None
    return item


def _cache_set(key, records, total):
    if len(CACHE) > 50:
        oldest_key = min(CACHE.items(), key=lambda kv: kv[1]["ts"])[0]
        CACHE.pop(oldest_key, None)
    CACHE[key] = {"ts": _now(), "records": records, "total": total}


def _clean_text(value):
    if not value:
        return ""
    cleaned = " ".join(value.split())
    return cleaned.strip(" /:;,.[]")


def _extract_year(value):
    if not value:
        return None
    match = re.search(r"(1[5-9]\d{2}|20\d{2})", value)
    if match:
        return int(match.group(0))
    return None


def _controlfield(record, tag):
    node = record.find(f"marc:controlfield[@tag='{tag}']", NS)
    if node is None or not node.text:
        return ""
    return node.text


def _datafields(record, tag):
    return record.findall(f"marc:datafield[@tag='{tag}']", NS)


def _subfields(datafield, code):
    return [
        sf.text
        for sf in datafield.findall(f"marc:subfield[@code='{code}']", NS)
        if sf.text
    ]


def _first_subfield(record, tag, code):
    for df in _datafields(record, tag):
        values = _subfields(df, code)
        if values:
            return _clean_text(values[0])
    return ""


def _extract_title(record):
    title_a = _first_subfield(record, "245", "a")
    title_b = _first_subfield(record, "245", "b")
    title = " ".join([part for part in [title_a, title_b] if part])
    return _clean_text(title)


def _extract_author(record):
    for tag in ["100", "110", "111", "700"]:
        author = _first_subfield(record, tag, "a")
        if author:
            return author
    return ""


def _extract_subjects(record):
    subjects = []
    for tag in ["650", "651"]:
        for df in _datafields(record, tag):
            for value in _subfields(df, "a"):
                cleaned = _clean_text(value)
                if cleaned:
                    subjects.append(cleaned)
    # Preserve order, remove duplicates
    seen = set()
    unique = []
    for item in subjects:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def _extract_language(record):
    field_041 = _first_subfield(record, "041", "a")
    if field_041:
        code = re.sub(r"[^A-Za-z]", "", field_041)
        if len(code) >= 3:
            return code[:3].lower()
    field_008 = _controlfield(record, "008")
    if len(field_008) >= 38:
        code = field_008[35:38].strip().lower()
        if code and code not in ["|||", "^^^"]:
            return code
    return ""


def _extract_year_from_record(record):
    for tag in ["260", "264"]:
        for df in _datafields(record, tag):
            for value in _subfields(df, "c"):
                year = _extract_year(value)
                if year:
                    return year
    field_008 = _controlfield(record, "008")
    if len(field_008) >= 11:
        year = _extract_year(field_008[7:11])
        if year:
            return year
    return None


def _parse_record(record):
    record_id = _controlfield(record, "001")
    return {
        "id": record_id,
        "title": _extract_title(record),
        "author": _extract_author(record),
        "year": _extract_year_from_record(record),
        "subjects": _extract_subjects(record),
        "language": _extract_language(record),
    }


def _build_cql(query_text, field):
    if not query_text:
        return ""
    q = query_text.strip().replace('"', '\\"')
    if field == "subject":
        index = "alma.subject"
    elif field == "title":
        index = "alma.title"
    elif field == "author":
        index = "alma.creator"
    else:
        index = "alma.all_for_ui"
    return f'{index}="{q}"'


def _fetch_sru_records(query_text, field, max_records, start_record, cql_override=""):
    cql = cql_override.strip() if cql_override else _build_cql(query_text, field)
    if not cql:
        return [], 0, "Missing query"

    cache_key = f"{cql}|{max_records}|{start_record}"
    cached = _cache_get(cache_key)
    if cached:
        return cached["records"], cached["total"], ""

    params = {
        "version": "1.2",
        "operation": "searchRetrieve",
        "recordSchema": "marcxml",
        "maximumRecords": max_records,
        "startRecord": start_record,
        "query": cql,
    }
    try:
        resp = requests.get(SRU_BASE_URL, params=params, timeout=12)
        resp.raise_for_status()
    except requests.RequestException as exc:
        return [], 0, f"SRU request failed: {exc}"

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError:
        return [], 0, "SRU response was not valid XML"

    diagnostics = root.findall(".//diag:diagnostic", NS)
    if diagnostics:
        message = diagnostics[0].findtext(
            "diag:message", default="Unknown SRU diagnostic", namespaces=NS
        )
        return [], 0, message

    total_text = root.findtext(".//srw:numberOfRecords", default="0", namespaces=NS)
    try:
        total = int(total_text)
    except ValueError:
        total = 0

    records = []
    for rec in root.findall(".//marc:record", NS):
        records.append(_parse_record(rec))

    _cache_set(cache_key, records, total)
    return records, total, ""


def _start_record(page, max_records):
    page = max(1, int(page))
    return (page - 1) * max_records + 1


def _total_pages(total, max_records):
    if total <= 0:
        return 0
    return max(1, math.ceil(total / max_records))


def _aggregate(records):
    year_counts = {}
    author_counts = {}
    subject_counts = {}
    language_counts = {}

    for record in records:
        year = record.get("year")
        if year:
            year_counts[year] = year_counts.get(year, 0) + 1

        author = record.get("author")
        if author:
            key = author.strip().lower()
            author_counts[key] = author_counts.get(key, 0) + 1

        for subject in record.get("subjects", []):
            key = subject.strip().lower()
            subject_counts[key] = subject_counts.get(key, 0) + 1

        language = record.get("language")
        if language:
            key = language.strip().lower()
            language_counts[key] = language_counts.get(key, 0) + 1

    return {
        "years": year_counts,
        "authors": author_counts,
        "subjects": subject_counts,
        "languages": language_counts,
    }


def _top_n(counts, n=5):
    sorted_items = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [{"value": key, "count": count} for key, count in sorted_items[:n]]


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/api/search")
def api_search():
    query_text = request.args.get("q", "").strip()
    field = request.args.get("field", "any").strip().lower()
    cql_override = request.args.get("cql", "")
    if not query_text and not cql_override:
        return jsonify({"error": "Missing query"}), 400
    try:
        max_records = int(request.args.get("maxRecords", DEFAULT_MAX_RECORDS))
    except ValueError:
        max_records = DEFAULT_MAX_RECORDS
    max_records = max(1, min(max_records, MAX_RECORDS_LIMIT))

    try:
        page = int(request.args.get("page", 1))
    except ValueError:
        page = 1
    start_record = _start_record(page, max_records)

    records, total, error = _fetch_sru_records(
        query_text, field, max_records, start_record, cql_override
    )
    if error:
        return jsonify({"error": error, "records": [], "total": 0}), 502

    return jsonify(
        {
            "query": {"q": query_text, "field": field, "cql": cql_override},
            "page": page,
            "startRecord": start_record,
            "totalPages": _total_pages(total, max_records),
            "records": records,
            "total": total,
            "limit": max_records,
            "sampled": True,
            "note": "Aggregations are computed on the fetched sample, not the full catalogue.",
        }
    )


@app.route("/api/aggregates")
def api_aggregates():
    query_text = request.args.get("q", "").strip()
    field = request.args.get("field", "any").strip().lower()
    cql_override = request.args.get("cql", "")
    if not query_text and not cql_override:
        return jsonify({"error": "Missing query"}), 400
    try:
        max_records = int(request.args.get("maxRecords", DEFAULT_MAX_RECORDS))
    except ValueError:
        max_records = DEFAULT_MAX_RECORDS
    max_records = max(1, min(max_records, MAX_RECORDS_LIMIT))

    try:
        page = int(request.args.get("page", 1))
    except ValueError:
        page = 1
    start_record = _start_record(page, max_records)

    records, total, error = _fetch_sru_records(
        query_text, field, max_records, start_record, cql_override
    )
    if error:
        return jsonify({"error": error, "records": [], "total": 0}), 502

    aggregates = _aggregate(records)
    return jsonify(
        {
            "query": {"q": query_text, "field": field, "cql": cql_override},
            "page": page,
            "startRecord": start_record,
            "totalPages": _total_pages(total, max_records),
            "total": total,
            "limit": max_records,
            "sampled": True,
            "note": "Aggregations are computed on the fetched sample, not the full catalogue.",
            "years": aggregates["years"],
            "top": {
                "authors": _top_n(aggregates["authors"], 5),
                "subjects": _top_n(aggregates["subjects"], 5),
                "languages": _top_n(aggregates["languages"], 5),
            },
        }
    )


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=3000)

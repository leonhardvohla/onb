# Catalogue Through Time (ONB SRU demo)

Half-day SPA demo showing a live SRU search against the ONB catalogue, a timeline of publication counts by year, and top authors/subjects/languages for a selected time range.

## What it does
- Search the ONB catalogue via SRU (live, no local dataset).
- Parse MARCXML into a small, normalized record shape.
- Visualize publication counts by year in a D3 timeline.
- Show top 5 authors, subjects, and languages for the selected range.
- Filter stats and the record list by brushing a year range on the timeline.

## Stack
- Backend: Flask + requests (SRU MARCXML parsing)
- Frontend: Vue 3 + D3 (CDN)

## Data flow (high level)
1) User enters a search term and field (any/subject/title/author).
2) Backend builds a CQL query and calls the ONB SRU endpoint.
3) SRU returns MARCXML, which is parsed and normalized.
4) Frontend renders the timeline and stats from the fetched sample.
5) Brushing a year range filters stats + records client-side.

## Search behavior
- Default field is "any" (mapped to `alma.all_for_ui`).
- Subject/title/author map to `alma.subject`, `alma.title`, `alma.author`.
- Results are capped (default 100 records, max 200) for speed.
- Aggregations are computed on the fetched sample, not the full catalogue.

## Backend
File: `backend/app.py`

### Endpoints
- `GET /api/search`
  - Params: `q`, `field`, `maxRecords`, optional `cql`
  - Returns: normalized `records`, `total` from SRU, and a `note` about sampling.

- `GET /api/aggregates`
  - Params: same as `/api/search`
  - Returns: `years` counts and `top` lists (authors/subjects/languages).
  - Not used by the current UI, but ready if you want server-side aggregates.

### Normalized record shape
- `id` (MARC 001)
- `title` (245$a + 245$b)
- `author` (first of 100/110/111/700$a)
- `year` (260/264$c or 008)
- `subjects` (650/651$a)
- `language` (041$a or 008)

### Caching
- In-memory cache keyed by CQL + maxRecords.
- TTL: 5 minutes.

## Frontend
File: `frontend/index.html`

- Vue 3 handles state (query, records, range, stats).
- D3 renders the timeline SVG and brush interaction.
- Stats and record list update client-side when the range changes.
- Search params are reflected in the URL (`?q=...&field=...`) and read on load.
- Default demo query is `author=Grillparzer` if no URL params are present.

## Run locally

1) Create a virtualenv and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2) Run tests:

```bash
python -m pytest backend/tests
```

3) Start the server (default port 5000):

```bash
python backend/app.py
```

Or use a custom port:

```bash
PORT=3000 python backend/app.py
```

4) Open the app:

```text
http://localhost:5000
```

## Notes and limitations
- Aggregations reflect the fetched sample, not the full catalogue.
- If the SRU index names differ, adjust the CQL mapping in `backend/app.py`.
- The UI is a single HTML file served by Flask (no build step).

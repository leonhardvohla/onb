# Catalogue Through Time (ONB SRU demo)

SPA demo showing a live SRU search against the ONB catalogue, a timeline of publication counts by year, and top authors/subjects/languages for a selected time range.

## What it does
- Search the ONB catalogue via SRU (live, no local dataset).
- Parse MARCXML into a small, normalized record shape.
- Visualize publication counts by year in a D3 timeline.
- Show top 5 authors, subjects, and languages for the selected range.
- Filter stats and the record list by brushing a year range on the timeline.

## Stack
- Backend: Flask + requests (SRU MARCXML parsing)
- Frontend: Vue 3 + D3 (Vite build)

## Data flow (high level)
1) User enters a search term and field (any/subject/title/author).
2) Backend builds a CQL query and calls the ONB SRU endpoint.
3) SRU returns MARCXML, which is parsed and normalized.
4) Frontend renders the timeline and stats from the fetched sample.
5) Brushing a year range filters stats + records client-side.

## Search behavior
- Default field is "any" (mapped to `alma.all_for_ui`).
- Subject/title/author map to `alma.subject`, `alma.title`, `alma.creator`.
 - Results are capped (default 100 records, max 1000) for speed.
- Aggregations are computed on the fetched sample, not the full catalogue.

## Backend
File: `backend/app.py`

### Endpoints
- `GET /api/search`
  - Params: `q`, `field`, `maxRecords`, `page`, optional `cql`
  - Returns: `page`, `startRecord`, `totalPages` to help with pagination UI.
  - Returns: normalized `records` and `total` from SRU.

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
Entry: `frontend/src/App.vue` (built by Vite)

- Vue 3 handles state (query, records, range, stats).
- D3 renders the timeline SVG and brush interaction.
- Stats and record list update client-side when the range changes.
- Search params are reflected in the URL (`?q=...&field=...&size=...&page=...`) and read on load.
- UI language (English/German) is auto-detected with precedence `?lang` -> localStorage -> browser locale; unsupported `lang` values are ignored.
- Sample sizes offered in the UI: 50, 100, 500, 1000.
- Default demo query is `author=Grillparzer` if no URL params are present.
- Sample size and page dropdown let you page through SRU results (first/last page plus 5 before/after the current one).

### Frontend environment
- `VITE_API_BASE`: base URL for the backend API (e.g. `https://your-backend.fly.dev`).
  - Used as the Vite dev-server proxy target for `/api`.
  - Used as the build-time API base URL in production.

## Deploy backend to Fly.io
- The backend deploy uses `backend/Dockerfile` and `backend/fly.toml` (Gunicorn on port 8080).
- From `backend/`, set your Fly app name in `fly.toml` (or run `fly launch --no-deploy` to generate it).
- Deploy with `fly deploy`.
- After deploy, set `VITE_API_BASE` to the Fly URL (for local dev or GitHub Pages).

## Deploy frontend to GitHub Pages
- Workflow: `.github/workflows/deploy-pages.yml` builds `frontend/` and publishes `frontend/dist`.
- In GitHub → Settings → Pages, set **Source** to **GitHub Actions**.
- In GitHub → Settings → Secrets and variables → Actions → Variables, add:
  - `VITE_API_BASE` = your backend URL
- The Vite build uses a relative base (`./`) so it works for project pages or custom domains without extra config.
- Ensure the backend allows CORS from your Pages origin (otherwise browser requests to `VITE_API_BASE` will be blocked).

## Run locally

1) Create a virtualenv and install backend dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2) Run backend tests:

```bash
python -m pytest backend/tests
```

3) Start the backend server (default port 3000):

```bash
python backend/app.py
```

Or use a custom port:

```bash
PORT=3000 python backend/app.py
```

4) Create a frontend env file (optional but recommended):

```bash
cd frontend
cp .env.example .env
```

5) Install frontend dependencies:

```bash
cd frontend
npm install
```

6) Start the frontend dev server (requests are proxied to `/api` on the backend):

```bash
VITE_API_BASE=http://localhost:3000 npm run dev
```

7) Open the app:

```text
http://localhost:5173
```

8) Run frontend tests:

```bash
cd frontend
npm test
```

## Notes and limitations
- Aggregations reflect the fetched sample, not the full catalogue.
- If the SRU index names differ, adjust the CQL mapping in `backend/app.py`.
- The frontend is built and deployed as static assets (the backend no longer serves the UI).

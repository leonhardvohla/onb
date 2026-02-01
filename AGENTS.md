# Project overview

Catalogue Through Time is a single-page demo that queries the ONB SRU API live, parses MARCXML into a small normalized shape, and visualizes publication counts by year with top authors/subjects/languages. The frontend is a Vue + D3 SPA served directly by the Flask backend.

## Expectations for agents

- For every code change, add or update tests that cover the change.
- After changes, test the app live with the Playwright MCP.
- Update `README.md` and this `AGENTS.md` when the change is user-facing or affects behavior, setup, or maintenance.

## Repo structure

- `backend/`: Flask SRU API client, MARCXML parsing, in-memory cache.
- `frontend/`: Single-page Vue + D3 UI (served by Flask).
- `backend/tests/`: Pytest tests for MARCXML parsing and behavior.

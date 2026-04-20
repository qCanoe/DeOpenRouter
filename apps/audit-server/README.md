# DeOpenRouter Audit Server

Python service that runs the **deopenrouter_audit** checks against a relay base URL and returns structured JSON (6D-style risk summary). See `THIRD_PARTY_NOTICES.md` for upstream reference credits.

To verify the same **canonical JSON** hash as the relay (`apps/api`), use `from deopenrouter_audit.canonical import canonical_dumps` on the parsed audit response dict.

## Requirements

- Python 3.11+
- Network access to the relay under test

## Install

From this directory:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

- `GET /health` — liveness
- `POST /v1/audit` — run full audit (may take up to several minutes depending on `timeout` and steps)

### Example: health

```bash
curl -s http://127.0.0.1:8765/health
```

### Example: audit

Replace `BASE_URL`, `API_KEY`, and `MODEL` with your relay settings.

```bash
curl -s -X POST http://127.0.0.1:8765/v1/audit ^
  -H "Content-Type: application/json" ^
  -d "{\"base_url\":\"https://relay.example.com/v1\",\"api_key\":\"sk-...\",\"model\":\"claude-opus-4-6\",\"timeout\":120,\"warmup\":0,\"profile\":\"general\",\"skip_infra\":true}"
```

On Unix shells, use single quotes around the JSON or escape quotes as usual.

**Timeouts:** `timeout` is passed to HTTP probes (seconds, default 120, max 600). Large values slow failure detection; small values may mark inconclusive dimensions.

## Tests

```bash
pytest
```

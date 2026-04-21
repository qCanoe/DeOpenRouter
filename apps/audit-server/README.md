# DeOpenRouter Audit Server

Python FastAPI service that runs the **deopenrouter_audit** checks against a relay base URL and returns structured JSON (6D-style risk summary). The relay in `apps/api/` can call this service during periodic or on-demand audit flows. See `THIRD_PARTY_NOTICES.md` for upstream reference credits.

To verify the same **canonical JSON** hash as the relay (`apps/api`), use `from deopenrouter_audit.canonical import canonical_dumps` on the parsed audit response object.

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

On Unix shells, activate the environment with `source .venv/bin/activate`.

## Run

```bash
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

Default base URL: `http://127.0.0.1:8765`

## Endpoints

- `GET /health` - returns `{"status":"ok"}`
- `POST /v1/audit` - runs the full audit and returns a structured response

`POST /v1/audit` may take up to several minutes depending on `timeout`, enabled steps, and relay responsiveness.

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

## Request Notes

- `base_url` should point at the relay base URL to probe
- the relay is expected to expose `/v1/chat/completions`
- `timeout` is passed to HTTP probes in seconds (default `120`, max `600`)
- large timeout values slow failure detection; smaller ones may produce more inconclusive checks

## Tests

```bash
pytest
```

## Related Docs

- `../../README.md` - repository overview and local demo flow
- `../../README.zh-CN.md` - Chinese root README
- `../../docs/DEMO_RUN.zh-CN.md` - step-by-step demo walkthrough

# Third-party notices

## api-relay-audit

This service includes code **ported into** the `deopenrouter_audit` Python package from the reference project **api-relay-audit** (MIT License).

- **Repository:** [https://github.com/toby-bridges/api-relay-audit](https://github.com/toby-bridges/api-relay-audit)
- **License:** MIT (see upstream repository for the full license text).

Ported or adapted areas include (non-exhaustive): HTTP client and streaming probes (`client.py`), context canary / length probing (`context.py`), identity heuristics (`identity.py`), error leakage analysis (`error_leakage.py`), stream integrity (`stream_integrity.py`), tool-call substitution checks (`tool_substitution.py`), Web3-related probes (`web3/`), reporter-style utilities (`reporter.py`, `transparent_log.py`), and the step orchestration derived from upstream `audit.py` (assembled in `steps_runtime.py`, `orchestrator.py`, `risk.py`, `recorder.py`).

**Runtime dependency policy:** this repository does **not** depend on the upstream package at runtime (no submodule, no `pip install` from that repo, no `import api_relay_audit`). The implementation lives only under `apps/audit-server/src/deopenrouter_audit/`.

Individual source files may carry shorter attribution headers pointing at specific upstream paths.

"""DeOpenRouter audit HTTP API (FastAPI)."""

from __future__ import annotations

from fastapi import FastAPI

from deopenrouter_audit import __version__
from deopenrouter_audit.models import AuditRequest, AuditResponse
from deopenrouter_audit.orchestrator import run_audit

app = FastAPI(title="DeOpenRouter Audit Server", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/audit", response_model=AuditResponse)
def post_audit(body: AuditRequest) -> AuditResponse:
    return run_audit(body)

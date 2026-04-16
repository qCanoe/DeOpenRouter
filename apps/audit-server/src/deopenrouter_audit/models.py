"""Pydantic models for the HTTP API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AuditRequest(BaseModel):
    base_url: str = Field(..., description="Relay base URL (e.g. https://relay.example.com or .../v1)")
    api_key: str = Field(..., description="API key (Bearer / x-api-key)")
    model: str = Field(default="claude-opus-4-6", description="Model id forwarded to the relay")
    timeout: int = Field(default=120, ge=5, le=600)
    warmup: int = Field(default=0, ge=0, le=500)
    profile: Literal["general", "web3", "full"] = "general"
    skip_infra: bool = Field(default=True, description="Skip dig/whois/openssl (recommended on Windows)")
    skip_context: bool = False
    skip_tool_substitution: bool = False
    skip_error_leakage: bool = False
    skip_stream_integrity: bool = False
    aggressive_error_probes: bool = False
    skip_web3_injection: bool = False


class StepPayload(BaseModel):
    step: int
    key: str
    events: list[dict]
    flags: list[dict]
    data: dict | None = None


class AuditResponse(BaseModel):
    ok: bool = True
    target: str
    model: str
    profile: str
    steps: list[dict]
    metrics: dict
    overall: dict
    step_crashes: list[str] = Field(default_factory=list)

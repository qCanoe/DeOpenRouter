"""Ensure no runtime dependency on the external audit package name in Python sources."""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "src"


def test_python_sources_no_api_relay_audit_import_token():
    forbidden = "api_relay_audit"
    for path in ROOT.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        assert forbidden not in text, f"{path} must not contain {forbidden!r}"

"""Deterministic JSON serialization matching `apps/api/src/canonicalJson.ts` for cross-language audit hashing."""

from __future__ import annotations

import json
from typing import Any


def _canonicalize(obj: Any) -> Any:
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, list):
        return [_canonicalize(x) for x in obj]
    if isinstance(obj, dict):
        keys = sorted(obj.keys())
        return {k: _canonicalize(obj[k]) for k in keys}
    # Match TS: unknown objects stringify via String(value)
    return str(obj)


def canonical_dumps(obj: Any) -> str:
    """Return minified JSON with sorted object keys at every level (no extra whitespace)."""
    # ensure_ascii=True matches JavaScript JSON.stringify Unicode escaping for cross-language hashes.
    return json.dumps(_canonicalize(obj), separators=(",", ":"), ensure_ascii=True)

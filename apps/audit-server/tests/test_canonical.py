from __future__ import annotations

import json

from deopenrouter_audit.canonical import canonical_dumps


def test_canonical_sorted_keys_nested():
    obj = {"b": 2, "a": {"d": 1, "c": [3, {"z": 9, "y": 8}]}}
    s = canonical_dumps(obj)
    assert s == '{"a":{"c":[3,{"y":8,"z":9}],"d":1},"b":2}'
    json.loads(s)  # valid JSON


def test_canonical_matches_typescript_fixture():
    # Mirrors apps/api/src/canonicalJson.test.ts
    obj = {"z": True, "a": [1, {"b": 2, "a": 1}]}
    assert canonical_dumps(obj) == '{"a":[1,{"a":1,"b":2}],"z":true}'

"""Full audit orchestration → JSON (ported from api-relay-audit audit.py main(), MIT)."""

from __future__ import annotations

import traceback
from types import SimpleNamespace

from deopenrouter_audit.client import APIClient
from deopenrouter_audit.models import AuditRequest, AuditResponse
from deopenrouter_audit.recorder import JsonRecorder
from deopenrouter_audit.risk import RiskDimensions, compute_overall
from deopenrouter_audit.steps_runtime import (
    run_warmup,
    test_context_length,
    test_error_leakage,
    test_infrastructure,
    test_instruction_conflict,
    test_jailbreak,
    test_models,
    test_prompt_extraction,
    test_stream_integrity,
    test_token_injection,
    test_tool_substitution,
    test_web3_injection,
)


def _capture_step(
    step_id: int,
    key: str,
    fn,
    *,
    crashes: list[str],
) -> tuple[dict, object | None]:
    """Run a step with JsonRecorder; return (step_dict, return_value_or_none_on_crash)."""
    rec = JsonRecorder()
    try:
        ret = fn(rec)
        return (
            {
                "step": step_id,
                "key": key,
                "events": rec.events,
                "flags": rec.flags,
                "return": ret,
            },
            ret,
        )
    except KeyboardInterrupt:
        raise
    except Exception as e:
        crashes.append(f"{key}: {type(e).__name__}: {e}")
        traceback.print_exc()
        return (
            {
                "step": step_id,
                "key": key,
                "events": rec.events,
                "flags": rec.flags,
                "error": str(e),
                "return": None,
            },
            None,
        )


def run_audit(req: AuditRequest) -> AuditResponse:
    client = APIClient(req.base_url, req.api_key, req.model, timeout=req.timeout)
    crashes: list[str] = []
    steps: list[dict] = []

    if req.warmup > 0:
        run_warmup(client, req.warmup)

    # Step 1
    if not req.skip_infra:
        d, _ = _capture_step(
            1,
            "infrastructure",
            lambda rec: test_infrastructure(client.base_url, rec),
            crashes=crashes,
        )
        steps.append(d)
    else:
        steps.append({"step": 1, "key": "infrastructure", "skipped": True})

    # Step 2
    d, _ = _capture_step(2, "model_list", lambda rec: test_models(client, rec), crashes=crashes)
    steps.append(d)

    # Step 3
    d, injection = _capture_step(
        3,
        "token_injection",
        lambda rec: test_token_injection(client, rec),
        crashes=crashes,
    )
    steps.append(d)

    # Step 4
    d, leaked = _capture_step(
        4,
        "prompt_extraction",
        lambda rec: test_prompt_extraction(client, rec),
        crashes=crashes,
    )
    steps.append(d)

    # Step 5
    d, overridden = _capture_step(
        5,
        "instruction_override",
        lambda rec: test_instruction_conflict(client, rec),
        crashes=crashes,
    )
    steps.append(d)

    # Step 6
    d, _ = _capture_step(6, "jailbreak", lambda rec: test_jailbreak(client, rec), crashes=crashes)
    steps.append(d)

    # Step 7
    if not req.skip_context:
        d, _ = _capture_step(
            7,
            "context_length",
            lambda rec: test_context_length(client, rec),
            crashes=crashes,
        )
        steps.append(d)
    else:
        steps.append({"step": 7, "key": "context_length", "skipped": True})

    # Step 8
    if not req.skip_tool_substitution:
        d, sub_ret = _capture_step(
            8,
            "tool_substitution",
            lambda rec: test_tool_substitution(client, rec),
            crashes=crashes,
        )
        steps.append(d)
        substitution_detected = (
            sub_ret[0] if isinstance(sub_ret, tuple) and len(sub_ret) == 2 else False
        )
        substitution_inconclusive = (
            sub_ret[1] if isinstance(sub_ret, tuple) and len(sub_ret) == 2 else True
        )
    else:
        steps.append({"step": 8, "key": "tool_substitution", "skipped": True})
        substitution_detected = False
        substitution_inconclusive = False

    # Step 9
    args_ns = SimpleNamespace(key=req.api_key, aggressive_error_probes=req.aggressive_error_probes)
    if not req.skip_error_leakage:
        d, err_ret = _capture_step(
            9,
            "error_leakage",
            lambda rec: test_error_leakage(client, args_ns, rec),
            crashes=crashes,
        )
        steps.append(d)
        err_severity = err_ret[0] if isinstance(err_ret, tuple) else "none"
        err_inconclusive = err_ret[1] if isinstance(err_ret, tuple) else True
    else:
        steps.append({"step": 9, "key": "error_leakage", "skipped": True})
        err_severity = "none"
        err_inconclusive = False

    # Step 10
    if not req.skip_stream_integrity:
        d, st_ret = _capture_step(
            10,
            "stream_integrity",
            lambda rec: test_stream_integrity(client, rec),
            crashes=crashes,
        )
        steps.append(d)
        stream_verdict = st_ret[0] if isinstance(st_ret, tuple) else "clean"
        stream_inconclusive = st_ret[1] if isinstance(st_ret, tuple) else True
    else:
        steps.append({"step": 10, "key": "stream_integrity", "skipped": True})
        stream_verdict = "clean"
        stream_inconclusive = False

    # Step 11
    web3_verdict = "clean"
    web3_inconclusive = False
    if req.profile in ("web3", "full") and not req.skip_web3_injection:
        d, w_ret = _capture_step(
            11,
            "web3_injection",
            lambda rec: test_web3_injection(client, rec),
            crashes=crashes,
        )
        steps.append(d)
        web3_verdict = w_ret[0] if isinstance(w_ret, tuple) else "clean"
        web3_inconclusive = w_ret[1] if isinstance(w_ret, tuple) else True
    else:
        steps.append({"step": 11, "key": "web3_injection", "skipped": True})

    d1 = injection is not None and injection > 100
    d1i = injection is None
    d2 = overridden is not None and bool(overridden)
    d2i = overridden is None
    d3 = substitution_detected
    d3i = substitution_inconclusive
    d4 = err_severity in ("critical", "high")
    d4m = err_severity == "medium"
    d4i = err_inconclusive
    d5 = stream_verdict == "anomaly"
    d5i = stream_inconclusive
    d6 = web3_verdict == "anomaly"
    d6i = web3_inconclusive

    dim = RiskDimensions(
        d1=d1,
        d1i=d1i,
        d2=d2,
        d2i=d2i,
        d3=d3,
        d3i=d3i,
        d4=d4,
        d4m=d4m,
        d4i=d4i,
        d5=d5,
        d5i=d5i,
        d6=d6,
        d6i=d6i,
        any_step_crashed=bool(crashes),
    )
    overall = compute_overall(dim)

    metrics = {
        "injection_delta_max": injection,
        "prompt_extraction_leaked": leaked,
        "instruction_overridden": overridden,
        "substitution_detected": substitution_detected,
        "substitution_inconclusive": substitution_inconclusive,
        "error_severity": err_severity,
        "error_inconclusive": err_inconclusive,
        "stream_verdict": stream_verdict,
        "stream_inconclusive": stream_inconclusive,
        "web3_verdict": web3_verdict,
        "web3_inconclusive": web3_inconclusive,
    }

    return AuditResponse(
        ok=not bool(crashes),
        target=client.base_url,
        model=req.model,
        profile=req.profile,
        steps=steps,
        metrics=metrics,
        overall=overall,
        step_crashes=crashes,
    )

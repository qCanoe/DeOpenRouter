"""6D risk matrix aggregation (ported from api-relay-audit audit.py main(), MIT)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class RiskDimensions:
    d1: bool  # hidden injection > 100 tokens
    d1i: bool  # step 3 inconclusive
    d2: bool  # instruction override
    d2i: bool
    d3: bool  # tool substitution
    d3i: bool
    d4: bool  # error critical/high
    d4m: bool  # error medium only
    d4i: bool
    d5: bool  # stream anomaly
    d5i: bool
    d6: bool  # web3 anomaly
    d6i: bool
    any_step_crashed: bool


def compute_overall(dim: RiskDimensions) -> dict[str, Any]:
    """First-match-wins rules from upstream audit."""
    d1, d1i = dim.d1, dim.d1i
    d2, d2i = dim.d2, dim.d2i
    d3, d3i, d4, d4m, d4i = dim.d3, dim.d3i, dim.d4, dim.d4m, dim.d4i
    d5, d5i, d6, d6i = dim.d5, dim.d5i, dim.d6, dim.d6i
    crashed = dim.any_step_crashed

    reasons: list[str] = []
    level = "LOW"

    if d3 or d4 or d5 or d6:
        level = "HIGH"
        if d3:
            reasons.append(
                "Tool-call package substitution detected (AC-1.a). "
                "A malicious middleware may rewrite package-install commands on the return path."
            )
        if d4:
            reasons.append(
                "Error response leaks credentials or upstream/internal plumbing (AC-2 adjacent)."
            )
        if d5:
            reasons.append(
                "Stream integrity anomaly (SSE-level): unknown events, usage rewrite, "
                "empty signatures, or non-Claude stream model."
            )
        if d6:
            reasons.append(
                "Web3 prompt injection detected: unsafe wallet-related behavior."
            )
    elif d1 and d2:
        level = "HIGH"
        reasons.append(
            "Hidden injection and user instruction override both detected — "
            "not suitable for custom-behavior workloads."
        )
    elif d1:
        level = "MEDIUM"
        reasons.append(
            "Hidden system prompt injection detected (>100 tokens delta); "
            "OK for simple Q&A, not recommended for complex apps."
        )
    elif d2:
        level = "MEDIUM"
        reasons.append("Instruction override detected (relay may ignore user system prompts).")
    elif d1i or d2i or d3i or d4i or d4m or d5i or d6i or crashed:
        level = "MEDIUM"
        if crashed:
            reasons.append("One or more audit steps crashed; re-run for a definitive verdict.")
        if d1i:
            reasons.append("Token injection step inconclusive.")
        if d2i:
            reasons.append("Instruction override step inconclusive.")
        if d3i:
            reasons.append("Tool substitution step inconclusive (all probes errored).")
        if d4m:
            reasons.append("Error responses leak paths/stack traces (medium severity).")
        if d4i:
            reasons.append("Error leakage step inconclusive (no error surface elicited).")
        if d5i:
            reasons.append("Stream integrity step inconclusive (non-Anthropic or broken stream).")
        if d6i:
            reasons.append("Web3 injection step inconclusive.")
    else:
        level = "LOW"
        reasons.append(
            "No significant injection, override, substitution, high-severity error leak, "
            "stream anomaly, or Web3 injection detected."
        )

    return {
        "level": level,
        "reasons": reasons,
        "dimensions": {
            "D1": d1,
            "D1i": d1i,
            "D2": d2,
            "D2i": d2i,
            "D3": d3,
            "D3i": d3i,
            "D4": d4,
            "D4m": d4m,
            "D4i": d4i,
            "D5": d5,
            "D5i": d5i,
            "D6": d6,
            "D6i": d6i,
            "step_crashed": crashed,
        },
    }

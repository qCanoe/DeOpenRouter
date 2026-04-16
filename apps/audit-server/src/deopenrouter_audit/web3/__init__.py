"""Web3-specific audit steps (profile=web3|full).

This subpackage contains detection logic that is only interesting
to Web3 / wallet users: crypto address substitution, signature
isolation violations, private key leak detection, etc.

These steps are gated behind the ``--profile web3`` or
``--profile full`` CLI flag so general API relay users (the 95%
case) don't pay the audit time cost for Web3-specific probes they
don't need. Same codebase, same tests, same distribution — just a
runtime selector instead of a git branch split.

Reference: SlowMist OpenClaw Security Practice Guide (signature
isolation principle) + Liu et al. arXiv:2604.08407 §5.2 (the ETH
drain case from a malicious relay).
"""

from deopenrouter_audit.web3.injection_probes import (
    WEB3_PROBES,
    Web3InjectionResult,
    classify_web3_response,
    run_web3_injection_probes,
)

__all__ = [
    "WEB3_PROBES",
    "Web3InjectionResult",
    "classify_web3_response",
    "run_web3_injection_probes",
]

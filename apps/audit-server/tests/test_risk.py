from deopenrouter_audit.risk import RiskDimensions, compute_overall


def test_compute_overall_high_from_d3():
    dim = RiskDimensions(
        d1=False,
        d1i=False,
        d2=False,
        d2i=False,
        d3=True,
        d3i=False,
        d4=False,
        d4m=False,
        d4i=False,
        d5=False,
        d5i=False,
        d6=False,
        d6i=False,
        any_step_crashed=False,
    )
    out = compute_overall(dim)
    assert out["level"] == "HIGH"
    assert any("Tool-call" in r for r in out["reasons"])


def test_compute_overall_medium_from_inconclusive():
    dim = RiskDimensions(
        d1=False,
        d1i=True,
        d2=False,
        d2i=False,
        d3=False,
        d3i=False,
        d4=False,
        d4m=False,
        d4i=False,
        d5=False,
        d5i=False,
        d6=False,
        d6i=False,
        any_step_crashed=False,
    )
    out = compute_overall(dim)
    assert out["level"] == "MEDIUM"
    assert any("inconclusive" in r.lower() for r in out["reasons"])


def test_compute_overall_low_clean():
    dim = RiskDimensions(
        d1=False,
        d1i=False,
        d2=False,
        d2i=False,
        d3=False,
        d3i=False,
        d4=False,
        d4m=False,
        d4i=False,
        d5=False,
        d5i=False,
        d6=False,
        d6i=False,
        any_step_crashed=False,
    )
    out = compute_overall(dim)
    assert out["level"] == "LOW"

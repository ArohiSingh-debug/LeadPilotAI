
from types import SimpleNamespace

from app.services.scoring import score_lead


def test_high_intent_lead_gets_hot_classification():
    lead = SimpleNamespace(
        budget=12000,
        timeline="Immediate",
        requirement=(
            "We need an automated lead management and"
            "qualification system to improve our B2B sales "
            "workflow and reduce manual work."
        ),
        company_size=25,
    )

    result = score_lead(lead)

    assert result["score"] == 87
    assert result["classification"] == "Hot"
    assert result["qualification_reason"]


def test_low_intent_lead_gets_cold_classification():
    lead = SimpleNamespace(
        budget=0,
        timeline="Not decided",
        requirement="Need software.",
        company_size=1,
    )

    result = score_lead(lead)

    assert result["score"] == 0
    assert result["classification"] == "Cold"


def test_score_never_exceeds_100():
    lead = SimpleNamespace(
        budget=100000,
        timeline="Immediate",
        requirement="A" * 300,
        company_size=100,
    )

    result = score_lead(lead)

    assert result["score"] <= 100
    assert result["score"] >= 0


def score_lead(lead):
    score = 0
    reasons = []

    budget = float(lead.budget or 0)

    if budget >= 10000:
        score += 30
        reasons.append("Strong stated budget (+30)")
    elif budget >= 5000:
        score += 22
        reasons.append("Moderate stated budget (+22)")
    elif budget > 0:
        score += 12
        reasons.append("Some budget indicated (+12)")
    else:
        reasons.append("Budget not specified (+0)")

    timeline = (lead.timeline or "").lower()

    if any(word in timeline for word in ["immediate", "this week", "1 week", "urgent"]):
        score += 25
        reasons.append("Urgent buying timeline (+25)")
    elif any(word in timeline for word in ["month", "30 day", "2 week", "soon"]):
        score += 18
        reasons.append("Near-term buying timeline (+18)")
    elif "quarter" in timeline or "3 month" in timeline:
        score += 10
        reasons.append("Medium-term timeline (+10)")
    else:
        reasons.append("No clear near-term timeline (+0)")

    requirement = (lead.requirement or "").strip()

    if len(requirement) >= 250:
        score += 25
        reasons.append("Detailed business requirement (+25)")
    elif len(requirement) >= 100:
        score += 18
        reasons.append("Useful requirement detail (+18)")
    elif len(requirement) >= 30:
        score += 10
        reasons.append("Basic requirement detail (+10)")
    else:
        reasons.append("Requirement needs clarification (+0)")

    company_size = int(lead.company_size or 1)

    if company_size >= 50:
        score += 20
        reasons.append("Established team size (+20)")
    elif company_size >= 10:
        score += 14
        reasons.append("Growing team size (+14)")
    elif company_size >= 2:
        score += 8
        reasons.append("Small team (+8)")
    else:
        reasons.append("Individual or team size unknown (+0)")

    score = min(score, 100)

    classification = (
        "Hot" if score >= 75
        else "Warm" if score >= 45
        else "Cold"
    )

    return {
        "score": score,
        "classification": classification,
        "qualification_reason": " | ".join(reasons),
    }


def generate_response(lead):
    return (
        f"Hi {lead.name},\n\n"
        f"Thanks for reaching out on behalf of {lead.company}. "
        f"We understand that you are exploring a solution for: "
        f"{lead.requirement[:350]}\n\n"
        f"We would like to understand your priorities, expected outcomes, "
        f"and implementation timeline before recommending the right approach.\n\n"
        f"Would you be available for a short discovery call this week?\n\n"
        f"Best,\nLaunchDesk Team\n\n"
        f"[Demo-generated draft - review before sending]"
    )

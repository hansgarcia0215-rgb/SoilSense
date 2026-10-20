"""
fuzzy_inference.py — Mamdani fuzzy inference engine

What it does:
    Implements the complete Mamdani fuzzy inference process:
    1. Fuzzification  — convert crisp inputs to membership degrees
    2. Rule evaluation — apply AND/OR fuzzy operators to each rule
    3. Aggregation    — combine all rule outputs into a combined output MF
    4. Defuzzification — convert aggregated output MF to a crisp fertility score

    The rules are loaded from the Firestore database (seeded in seed.js).
    If the database is unavailable, a fallback set of built-in rules is used.

Why Mamdani?
    Mamdani inference is the most interpretable fuzzy method.
    Each rule is a plain-language IF-THEN statement.
    This is important for academic defensibility and farmer transparency.

Defuzzification method: Centroid (Center of Gravity)
    The centroid method takes the center of mass of the aggregated output
    membership function, giving the most balanced result.

How to test:
    from engine.fuzzy_inference import infer_fertility
    result = infer_fertility(ph=6.2, moisture=57, visual_condition="good")
    print(result)
"""

import numpy as np
from engine.membership_functions import (
    ph_membership, moisture_membership, visual_condition_membership,
    get_dominant_ph_set, get_dominant_moisture_set, FERTILITY_OUTPUT
)


# ─── Built-in fallback rules ─────────────────────────────────────────────────
# Used if the Firestore rule database is unavailable.
# These mirror the rules seeded in seed.js.
BUILTIN_RULES = [
    {"ruleId": "r01", "ph": "optimal",          "moisture": "moderate", "visualCondition": "good",     "fertilityClass": "fertile",  "strength": 1.0},
    {"ruleId": "r02", "ph": "optimal",          "moisture": "wet",      "visualCondition": "good",     "fertilityClass": "fertile",  "strength": 0.9},
    {"ruleId": "r03", "ph": "slightly_alkaline","moisture": "moderate", "visualCondition": "good",     "fertilityClass": "fertile",  "strength": 0.8},
    {"ruleId": "r04", "ph": "optimal",          "moisture": "moderate", "visualCondition": "moderate", "fertilityClass": "fertile",  "strength": 0.75},
    {"ruleId": "r05", "ph": "acidic",           "moisture": "moderate", "visualCondition": "good",     "fertilityClass": "moderate", "strength": 0.85},
    {"ruleId": "r06", "ph": "acidic",           "moisture": "moderate", "visualCondition": "moderate", "fertilityClass": "moderate", "strength": 0.70},
    {"ruleId": "r07", "ph": "optimal",          "moisture": "dry",      "visualCondition": "moderate", "fertilityClass": "moderate", "strength": 0.70},
    {"ruleId": "r08", "ph": "slightly_alkaline","moisture": "moderate", "visualCondition": "moderate", "fertilityClass": "moderate", "strength": 0.70},
    {"ruleId": "r09", "ph": "acidic",           "moisture": "wet",      "visualCondition": "good",     "fertilityClass": "moderate", "strength": 0.65},
    {"ruleId": "r10", "ph": "optimal",          "moisture": "dry",      "visualCondition": "poor",     "fertilityClass": "moderate", "strength": 0.55},
    {"ruleId": "r11", "ph": "strongly_acidic",  "moisture": "dry",      "visualCondition": "poor",     "fertilityClass": "poor",     "strength": 1.0},
    {"ruleId": "r12", "ph": "strongly_acidic",  "moisture": "moderate", "visualCondition": "poor",     "fertilityClass": "poor",     "strength": 0.9},
    {"ruleId": "r13", "ph": "alkaline",         "moisture": "dry",      "visualCondition": "poor",     "fertilityClass": "poor",     "strength": 0.85},
    {"ruleId": "r14", "ph": "strongly_acidic",  "moisture": "dry",      "visualCondition": "moderate", "fertilityClass": "poor",     "strength": 0.80},
    {"ruleId": "r15", "ph": "acidic",           "moisture": "dry",      "visualCondition": "poor",     "fertilityClass": "poor",     "strength": 0.75},
]

# Output universe for defuzzification (0–100 scale, 1000 points for precision)
OUTPUT_UNIVERSE = np.linspace(0, 100, 1000)

# Center points of each output class for centroid calculation
OUTPUT_CENTERS = {
    "poor":     20.0,
    "moderate": 55.0,
    "fertile":  82.0,
}


def infer_fertility(ph: float, moisture: float, visual_condition: str,
                    rules: list = None) -> dict:
    """
    Run the full Mamdani fuzzy inference pipeline.

    Args:
        ph:               Soil pH (0–14), or None if not available
        moisture:         Soil moisture % (0–100), or None if not available
        visual_condition: "good" | "moderate" | "poor" (from image processing)
        rules:            List of rule dicts (from DB). Uses BUILTIN_RULES if None.

    Returns:
        dict with:
            fertilityClass  str     "fertile" | "moderate" | "poor"
            fertilityScore  float   0–100 (crisp output)
            confidence      float   0–100 (assessment confidence %)
            activatedRules  list    IDs of rules that fired
            phFuzzySet      str     dominant pH fuzzy set
            moistureFuzzySet str    dominant moisture fuzzy set
            ruleExplanation list    beginner-friendly explanations
            inputsUsed      dict    which inputs were available
    """
    if rules is None:
        rules = BUILTIN_RULES

    # ── Track which inputs are available ─────────────────────────────────────
    has_ph       = ph is not None and 0 <= ph <= 14
    has_moisture = moisture is not None and 0 <= moisture <= 100

    # ── 1. FUZZIFICATION ─────────────────────────────────────────────────────
    # Convert crisp inputs to membership degrees for every fuzzy set

    if has_ph:
        ph_memberships = ph_membership(ph)
        ph_fuzzy_set   = get_dominant_ph_set(ph)
    else:
        # No pH available — use neutral/uncertain prior (weak membership for all sets)
        ph_memberships = {
            "strongly_acidic": 0.1, "acidic": 0.2, "slightly_acidic": 0.3,
            "optimal": 0.4, "slightly_alkaline": 0.3, "alkaline": 0.1,
        }
        ph_fuzzy_set = "unknown"

    if has_moisture:
        moisture_memberships = moisture_membership(moisture)
        moisture_fuzzy_set   = get_dominant_moisture_set(moisture)
    else:
        moisture_memberships = {
            "very_dry": 0.1, "dry": 0.2, "moderate": 0.5, "wet": 0.2, "very_wet": 0.1,
        }
        moisture_fuzzy_set = "unknown"

    visual_memberships = visual_condition_membership(visual_condition)

    # ── 2. RULE EVALUATION ────────────────────────────────────────────────────
    # For each rule: firing_strength = min(antecedent memberships)
    # (Mamdani AND operator = minimum)

    activated = []   # Rules that fired with strength > threshold
    rule_outputs = {"poor": [], "moderate": [], "fertile": []}

    FIRE_THRESHOLD = 0.05  # Rules that fire below this are ignored

    for rule in rules:
        # Get membership for each antecedent
        ph_m         = ph_memberships.get(rule.get("ph", ""), 0.0)
        moisture_m   = moisture_memberships.get(rule.get("moisture", ""), 0.0)
        visual_m     = visual_memberships.get(rule.get("visualCondition", ""), 0.0)

        # AND: take the minimum membership across all antecedents
        firing_strength = min(ph_m, moisture_m, visual_m)

        # Apply the rule's own weight (defined by researcher in DB)
        rule_weight = float(rule.get("strength", 1.0))
        effective_strength = firing_strength * rule_weight

        if effective_strength > FIRE_THRESHOLD:
            output_class = rule.get("fertilityClass", "moderate").lower()
            rule_outputs[output_class].append(effective_strength)
            activated.append({
                "ruleId":           rule.get("ruleId", "?"),
                "firingStrength":   round(effective_strength, 3),
                "output":           output_class,
                "phMatch":          round(ph_m, 3),
                "moistureMatch":    round(moisture_m, 3),
                "visualMatch":      round(visual_m, 3),
            })

    # ── 3. AGGREGATION ────────────────────────────────────────────────────────
    # For each output class, take the MAXIMUM firing strength across all
    # rules that produced that output (Mamdani maximum aggregation).

    agg_poor     = max(rule_outputs["poor"],     default=0.0)
    agg_moderate = max(rule_outputs["moderate"], default=0.0)
    agg_fertile  = max(rule_outputs["fertile"],  default=0.0)

    # Handle case: no rules fired at all (very unusual input combination)
    if agg_poor == 0.0 and agg_moderate == 0.0 and agg_fertile == 0.0:
        # Default to moderate with low confidence when no rules match
        agg_moderate = 0.3

    # ── 4. DEFUZZIFICATION (Centroid Method) ─────────────────────────────────
    # Compute a crisp output score using weighted center of gravity.

    # Compute a simplified centroid:
    # Score = weighted average of output class centers
    total_weight = agg_poor + agg_moderate + agg_fertile

    if total_weight == 0:
        fertility_score = 50.0  # Fallback
    else:
        fertility_score = (
            agg_poor     * OUTPUT_CENTERS["poor"]     +
            agg_moderate * OUTPUT_CENTERS["moderate"] +
            agg_fertile  * OUTPUT_CENTERS["fertile"]
        ) / total_weight

    fertility_score = round(float(fertility_score), 1)

    # ── 5. CLASSIFICATION ─────────────────────────────────────────────────────
    # Classify based on the score thresholds (from agricultural_standards seed)
    if fertility_score >= 70:
        fertility_class = "fertile"
    elif fertility_score >= 40:
        fertility_class = "moderate"
    else:
        fertility_class = "poor"

    # ── 6. CONFIDENCE SCORE ───────────────────────────────────────────────────
    confidence = _calculate_confidence(
        has_ph=has_ph,
        has_moisture=has_moisture,
        visual_condition=visual_condition,
        activated_count=len(activated),
        total_rules=len(rules),
        dominant_strength=max(agg_poor, agg_moderate, agg_fertile),
    )

    # ── 7. RULE EXPLANATIONS ─────────────────────────────────────────────────
    explanations = _generate_explanations(
        ph=ph, has_ph=has_ph,
        moisture=moisture, has_moisture=has_moisture,
        visual_condition=visual_condition,
        ph_fuzzy_set=ph_fuzzy_set,
        moisture_fuzzy_set=moisture_fuzzy_set,
        fertility_class=fertility_class,
        fertility_score=fertility_score,
        activated=activated,
    )

    return {
        "fertilityClass":    fertility_class,
        "fertilityScore":    fertility_score,
        "confidence":        round(confidence, 1),
        "confidenceLevel":   "high" if confidence >= 75 else "limited",
        "phFuzzySet":        ph_fuzzy_set,
        "moistureFuzzySet":  moisture_fuzzy_set,
        "activatedRules":    [r["ruleId"] for r in activated],
        "activatedRuleDetails": activated,
        "aggregation": {
            "poor":     round(agg_poor, 3),
            "moderate": round(agg_moderate, 3),
            "fertile":  round(agg_fertile, 3),
        },
        "inputsUsed": {
            "ph":             has_ph,
            "moisture":       has_moisture,
            "visualCondition": True,
        },
        "explanation":   explanations["summary"],
        "explanationList": explanations["factors"],
    }


def _calculate_confidence(has_ph: bool, has_moisture: bool, visual_condition: str,
                           activated_count: int, total_rules: int,
                           dominant_strength: float) -> float:
    """
    Calculate assessment confidence (0–100).

    Confidence is NOT classification accuracy.
    It represents how strongly the available inputs support the result.
    """
    score = 40.0  # Base confidence — even image-only gives some signal

    # Each available input adds confidence
    if has_ph:        score += 20.0
    if has_moisture:  score += 15.0

    # Image quality
    if visual_condition == "good":     score += 10.0
    elif visual_condition == "moderate": score += 5.0

    # Rule activation — more rules firing = higher agreement
    if activated_count >= 3:  score += 10.0
    elif activated_count >= 1: score += 5.0

    # Dominant rule strength
    score += dominant_strength * 5.0

    return min(95.0, max(20.0, score))


def _generate_explanations(ph, has_ph, moisture, has_moisture, visual_condition,
                            ph_fuzzy_set, moisture_fuzzy_set, fertility_class,
                            fertility_score, activated) -> dict:
    """
    Generate beginner-friendly explanations of the result.
    Returns a summary string and a list of bullet-point factors.
    """
    factors = []

    if has_ph:
        ph_labels = {
            "strongly_acidic":   "strongly acidic (very low pH)",
            "acidic":            "acidic",
            "slightly_acidic":   "slightly acidic",
            "optimal":           "optimal for most crops",
            "slightly_alkaline": "slightly alkaline",
            "alkaline":          "alkaline (high pH)",
            "unknown":           "not measured",
        }
        factors.append(f"Soil pH ({ph:.1f}) is {ph_labels.get(ph_fuzzy_set, ph_fuzzy_set)}.")
    else:
        factors.append("Soil pH was not measured. For more reliable results, use the ESP32 sensor.")

    if has_moisture:
        moisture_labels = {
            "very_dry": "very dry",
            "dry":      "dry",
            "moderate": "moderate — good for most crops",
            "wet":      "moist to wet",
            "very_wet": "very wet",
            "unknown":  "not measured",
        }
        factors.append(
            f"Soil moisture ({moisture:.0f}%) is {moisture_labels.get(moisture_fuzzy_set, moisture_fuzzy_set)}."
        )
    else:
        factors.append("Soil moisture was not measured.")

    visual_labels = {"good": "good", "moderate": "moderate", "poor": "poor — consider retaking the photo"}
    factors.append(f"Soil image quality is {visual_labels.get(visual_condition, visual_condition)}.")

    if len(activated) > 0:
        factors.append(f"{len(activated)} fuzzy rule(s) supported the {fertility_class.capitalize()} classification.")

    summary = (
        f"The soil was classified as {fertility_class.upper()} with a score of "
        f"{fertility_score}/100. "
        + " ".join(factors)
    )

    return {"summary": summary, "factors": factors}

"""
crop_engine.py — Crop suitability scoring and ranking engine

What it does:
    Evaluates every candidate crop against the SOIL FERTILITY RESULT
    produced by the fuzzy logic engine. Returns exactly three ranked outcomes:
        🥇 BEST CROP
        🥈 SECOND-BEST CROP
        🚫 NOT SUITABLE / LAST OPTION

    The recommendation is ALWAYS driven by the soil fertility result first,
    then further refined by pH, moisture, and soil condition compatibility.

    This engine handles both:
        MODE A — existing farm crops (currentFarmCrop = true)
        MODE B — all candidate crops in the database

Key principle:
    fertilityMin in each crop's requirements is the primary gate.
    A crop that requires "fertile" soil will score very low on "poor" soil,
    regardless of pH compatibility.

Data flow:
    FUZZY FERTILITY RESULT (class + score)
          ↓
    For each crop: compute weighted suitability score
          ↓
    Sort by score descending
          ↓
    Return BEST / SECOND_BEST / NOT_SUITABLE
"""

from engine.membership_functions import (
    ph_membership, moisture_membership,
    get_dominant_ph_set, get_dominant_moisture_set,
)


# ─── Fertility level ordinal mapping ─────────────────────────────────────────
# Lower number = less fertile.
# Used to compare crop requirement against current soil fertility class.
FERTILITY_ORDER = {
    "poor":     0,
    "low":      0,   # alias
    "moderate": 1,
    "fertile":  2,
    "high":     2,   # alias
}


def rank_crops(
    ph:               float,
    moisture:         float,
    fertility_class:  str,
    fertility_score:  float,
    visual_condition: str,
    crops:            list,
    location_score:   float = 0.8,  # High default — Roxas lowland is good for tropical trees
    return_top_n:     int   = 3,    # Return exactly this many entries
) -> list:
    """
    Score and rank ALL active crops, then return the top N.

    Args:
        ph:              Soil pH (0–14) or None
        moisture:        Soil moisture % (0–100) or None
        fertility_class: "fertile" | "moderate" | "poor" (from fuzzy engine)
        fertility_score: 0–100 numeric fertility score
        visual_condition:"good" | "moderate" | "poor"
        crops:           List of crop dicts from Firestore
        location_score:  0–1 regional suitability (default 0.8 for Roxas)
        return_top_n:    How many ranked results to return (default 3)

    Returns:
        List of up to return_top_n items with rank, status, score, explanations.
    """
    scored = []

    for crop in crops:
        if not crop.get("isActive", True):
            continue
        result = _score_crop(
            crop=crop,
            ph=ph,
            moisture=moisture,
            fertility_class=fertility_class,
            fertility_score=fertility_score,
            visual_condition=visual_condition,
            location_score=location_score,
        )
        scored.append(result)

    if not scored:
        return []

    # Sort descending by suitabilityScore, then alphabetically as tiebreaker
    scored.sort(key=lambda c: (-c["suitabilityScore"], c["cropName"]))

    return _assign_ranks(scored, return_top_n)


def _score_crop(crop, ph, moisture, fertility_class, fertility_score,
                visual_condition, location_score) -> dict:
    """
    Compute a weighted composite suitability score for one crop.

    The fertility compatibility component is the primary driver —
    it reflects the fuzzy fertility result directly.
    """
    req     = crop.get("requirements", {})
    weights = crop.get("suitabilityWeights", {
        "fertility":    0.30,  # PRIMARY driver — driven by fuzzy result
        "ph":           0.25,
        "moisture":     0.20,
        "soilCondition":0.15,
        "location":     0.10,
    })

    matching_factors = []
    limiting_factors = []

    # ── 1. FERTILITY COMPATIBILITY (primary driver) ───────────────────────────
    # This is the central link between the fuzzy result and the recommendation.
    fertility_required = req.get("fertilityMin", "moderate").lower()
    current_level  = FERTILITY_ORDER.get(fertility_class.lower(), 1)
    required_level = FERTILITY_ORDER.get(fertility_required, 1)

    if current_level >= required_level:
        surplus = current_level - required_level
        # Base 0.80 + bonus for exceeding requirement + small bonus from score
        fertility_compat = min(1.0, 0.80 + surplus * 0.12 + (fertility_score / 1000.0))
        matching_factors.append(
            f"Soil fertility ({fertility_class.capitalize()}, score {fertility_score:.0f}/100) "
            f"meets the crop's requirement ({fertility_required.capitalize()})."
        )
    else:
        deficit = required_level - current_level
        # Each level below requirement drops score by ~0.28
        fertility_compat = max(0.0, 0.60 - deficit * 0.28)
        limiting_factors.append(
            f"Soil fertility ({fertility_class.capitalize()}) is below the "
            f"crop's minimum requirement ({fertility_required.capitalize()})."
        )

    # ── 2. pH COMPATIBILITY ───────────────────────────────────────────────────
    ph_score = _score_range(
        value=ph,
        val_min=req.get("phMin", 5.5),
        val_max=req.get("phMax", 7.5),
        val_opt=req.get("phOptimal", 6.5),
        penalty_per_unit=0.35,
        name="Soil pH",
        unit="",
        matching=matching_factors,
        limiting=limiting_factors,
    )

    # ── 3. MOISTURE COMPATIBILITY ─────────────────────────────────────────────
    moisture_score = _score_range(
        value=moisture,
        val_min=req.get("moistureMin", 40),
        val_max=req.get("moistureMax", 80),
        val_opt=req.get("moistureOptimal", 60),
        penalty_per_unit=0.025,
        name="Soil moisture",
        unit="%",
        matching=matching_factors,
        limiting=limiting_factors,
    )

    # ── 4. SOIL CONDITION (visual) ────────────────────────────────────────────
    condition_map   = {"good": 1.0, "moderate": 0.65, "poor": 0.30}
    soil_cond_score = condition_map.get(visual_condition.lower(), 0.65)
    if visual_condition == "good":
        matching_factors.append("Soil visual condition is good.")
    elif visual_condition == "poor":
        limiting_factors.append("Soil visual condition is poor — structure may need improvement.")

    # ── 5. LOCATION CONTEXT ───────────────────────────────────────────────────
    loc_score = float(crop.get("locationScoreRoxas", location_score))
    if loc_score >= 0.7:
        matching_factors.append("Crop is suitable for the Roxas, Oriental Mindoro region.")
    elif loc_score < 0.5:
        limiting_factors.append("Crop may have limited suitability for this location.")

    # ── WEIGHTED COMPOSITE ────────────────────────────────────────────────────
    composite = (
        fertility_compat * weights.get("fertility",     0.30) +
        ph_score         * weights.get("ph",            0.25) +
        moisture_score   * weights.get("moisture",      0.20) +
        soil_cond_score  * weights.get("soilCondition", 0.15) +
        loc_score        * weights.get("location",      0.10)
    )

    suitability_score = round(min(100.0, max(0.0, composite * 100)), 1)
    min_threshold     = crop.get("minSuitabilityThreshold", 45)

    return {
        "cropId":            crop.get("cropId", ""),
        "cropName":          crop.get("cropName", ""),
        "localName":         crop.get("localName", ""),
        "category":          crop.get("category", ""),
        "currentFarmCrop":   crop.get("currentFarmCrop", False),
        "suitabilityScore":  suitability_score,
        "meetsThreshold":    suitability_score >= min_threshold,
        "minThreshold":      min_threshold,
        "componentScores": {
            "fertility":     round(fertility_compat  * 100, 1),
            "pH":            round(ph_score          * 100, 1),
            "moisture":      round(moisture_score    * 100, 1),
            "soilCondition": round(soil_cond_score   * 100, 1),
            "location":      round(loc_score         * 100, 1),
        },
        "matchingFactors":   matching_factors,
        "limitingFactors":   limiting_factors,
        # Farmer-friendly summary
        "farmerSummary":     _build_farmer_summary(
            crop_name=crop.get("cropName", ""),
            fertility_class=fertility_class,
            fertility_score=fertility_score,
            suitability_score=suitability_score,
            matching=matching_factors,
            limiting=limiting_factors,
        ),
    }


def _score_range(value, val_min, val_max, val_opt,
                 penalty_per_unit, name, unit,
                 matching, limiting) -> float:
    """
    Generic range compatibility scorer.
    Returns 0.0–1.0. Returns 0.5 (neutral) if value is None.
    """
    if value is None:
        limiting.append(f"{name} not measured — using neutral estimate.")
        return 0.5

    if val_min <= value <= val_max:
        distance = abs(value - val_opt)
        half_range = (val_max - val_min) / 2.0
        score = 1.0 - (distance / (half_range + 1e-9)) * 0.25
        score = max(0.70, min(1.0, score))
        matching.append(
            f"{name} ({value:.1f}{unit}) is within the preferred range "
            f"({val_min}–{val_max}{unit})."
        )
    elif value < val_min:
        score = max(0.0, 1.0 - (val_min - value) * penalty_per_unit)
        limiting.append(
            f"{name} ({value:.1f}{unit}) is below the minimum "
            f"({val_min}{unit})."
        )
    else:
        score = max(0.0, 1.0 - (value - val_max) * penalty_per_unit)
        limiting.append(
            f"{name} ({value:.1f}{unit}) exceeds the maximum "
            f"({val_max}{unit})."
        )
    return score


def _assign_ranks(scored: list, n: int) -> list:
    """
    Assign BEST / SECOND_BEST / NOT_SUITABLE to the top N items.
    Always returns exactly n entries (or all if fewer than n crops).
    If the best crop is below threshold, it becomes CLOSEST instead.
    """
    result = []

    for i, crop in enumerate(scored):
        entry = {**crop, "rank": i + 1}

        if i == 0:
            if crop["meetsThreshold"]:
                entry["status"]      = "BEST"
                entry["statusLabel"] = "🥇 Best Crop"
                entry["recommendedAction"] = (
                    f"Your soil is most compatible with {crop['cropName']}. "
                    f"Prioritize this crop for planting under the current soil condition."
                )
            else:
                entry["status"]      = "CLOSEST"
                entry["statusLabel"] = "⚠️ Closest Option"
                entry["recommendedAction"] = (
                    f"No crop currently meets the minimum suitability threshold. "
                    f"{crop['cropName']} is the closest match at "
                    f"{crop['suitabilityScore']:.0f}%. "
                    f"Consider improving soil conditions before planting."
                )

        elif i == n - 1:
            # Last slot is always NOT_SUITABLE
            entry["status"]      = "NOT_SUITABLE"
            entry["statusLabel"] = "🚫 Not Suitable / Last Option"
            entry["recommendedAction"] = (
                f"Based on the current soil condition, {crop['cropName']} is "
                f"the least suitable among the evaluated crops. "
                f"This does not mean it can never grow here — it means the current "
                f"soil condition does not support its requirements. "
                f"Soil improvement is recommended before considering this crop."
            )

        else:
            if crop["meetsThreshold"]:
                entry["status"]      = "SECOND_BEST"
                entry["statusLabel"] = "🥈 Second-Best Crop"
                entry["recommendedAction"] = (
                    f"{crop['cropName']} is a suitable alternative. "
                    f"Soil conditions are generally compatible with its requirements."
                )
            else:
                entry["status"]      = "NOT_SUITABLE"
                entry["statusLabel"] = "🚫 Not Suitable"
                entry["recommendedAction"] = (
                    f"Soil conditions do not currently match "
                    f"{crop['cropName']}'s requirements."
                )

        result.append(entry)
        if len(result) == n:
            break

    return result


def _build_farmer_summary(crop_name, fertility_class, fertility_score,
                          suitability_score, matching, limiting) -> str:
    """
    Build a plain-language summary the farmer can understand without
    needing to read the technical scores.
    """
    if suitability_score >= 80:
        level = "highly suitable"
        advice = "The current soil condition is very compatible with this crop."
    elif suitability_score >= 65:
        level = "suitable"
        advice = "The current soil condition is generally compatible with this crop."
    elif suitability_score >= 50:
        level = "moderately suitable"
        advice = "Some soil conditions match, but improvements may be needed."
    else:
        level = "not currently suitable"
        advice = "The current soil condition does not well match this crop's requirements."

    summary = (
        f"Your soil is {fertility_class} (score: {fertility_score:.0f}/100). "
        f"{crop_name} is {level} for the current soil condition. "
        f"{advice}"
    )
    if limiting:
        summary += f" Main limiting factor: {limiting[0]}"
    return summary

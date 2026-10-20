"""
rootcrop_engine.py — Rootcrop suitability scoring and ranking engine

What it does:
    Computes a suitability score (0–100%) for each registered rootcrop
    based on the current soil conditions. Returns a ranked list with
    exactly three outcomes: BEST, SECOND_BEST, and NOT_SUITABLE.

    Each score is a weighted combination of:
        pH compatibility        30%
        Moisture compatibility  20%
        Fertility compatibility 25%
        Soil condition          15%
        Location context        10%
    (weights are configurable per-crop in the database)

Why NOT hard-coded rankings:
    Rankings must emerge from the soil conditions.
    If sweet potato always appeared first, it would not be useful.

Minimum suitability threshold:
    If NO crop meets its minimum threshold, none is labeled "suitable".
    The system clearly explains this and recommends the closest option.

How to test:
    from engine.rootcrop_engine import rank_rootcrops
    crops = [...]  # From Firestore 'crops' collection
    result = rank_rootcrops(ph=6.2, moisture=57, fertility_class="moderate",
                            fertility_score=68, visual_condition="good", crops=crops)
"""

from engine.membership_functions import ph_membership, moisture_membership


# ─── Suitability Scoring ──────────────────────────────────────────────────────

def rank_rootcrops(
    ph: float,
    moisture: float,
    fertility_class: str,
    fertility_score: float,
    visual_condition: str,
    crops: list,
    location_score: float = 0.7,  # Default location context score (Roxas, Oriental Mindoro)
) -> list:
    """
    Score and rank all active rootcrops by suitability.

    Args:
        ph:               Soil pH, or None
        moisture:         Soil moisture %, or None
        fertility_class:  "fertile" | "moderate" | "poor"
        fertility_score:  0–100 numeric score
        visual_condition: "good" | "moderate" | "poor"
        crops:            List of crop dicts from Firestore
        location_score:   0–1 location compatibility (default 0.7 for Roxas target area)

    Returns:
        List of crop results sorted by score desc, with rank, status, and explanations.
        Always 3 items: BEST, SECOND_BEST, NOT_SUITABLE.
    """
    scored_crops = []

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
        scored_crops.append(result)

    # Sort by score descending
    scored_crops.sort(key=lambda c: c["suitabilityScore"], reverse=True)

    # Apply tie-breaking: if scores within 1 point, sort by cropName alphabetically
    # to ensure deterministic ordering
    _stable_sort(scored_crops)

    # Ensure minimum threshold logic
    return _apply_ranking(scored_crops)


def _score_crop(crop: dict, ph, moisture, fertility_class, fertility_score,
                visual_condition, location_score) -> dict:
    """
    Compute a weighted suitability score for a single crop.
    """
    req     = crop.get("requirements", {})
    weights = crop.get("suitabilityWeights", {
        "ph": 0.30, "moisture": 0.20, "fertility": 0.25,
        "soilCondition": 0.15, "location": 0.10,
    })

    matching_factors  = []
    limiting_factors  = []

    # ── pH Compatibility ──────────────────────────────────────────────────────
    ph_score = 0.0
    if ph is not None:
        ph_min = req.get("phMin", 5.5)
        ph_max = req.get("phMax", 7.0)
        ph_opt = req.get("phOptimal", (ph_min + ph_max) / 2)

        if ph_min <= ph <= ph_max:
            # Within range — full to slightly less depending on distance from optimal
            distance_from_opt = abs(ph - ph_opt)
            range_half = (ph_max - ph_min) / 2
            ph_score = 1.0 - (distance_from_opt / (range_half + 1e-6)) * 0.3
            ph_score = max(0.7, min(1.0, ph_score))
            matching_factors.append(f"Soil pH ({ph:.1f}) is within the preferred range ({ph_min}–{ph_max}).")
        elif ph < ph_min:
            deficit = ph_min - ph
            ph_score = max(0.0, 1.0 - deficit * 0.4)
            limiting_factors.append(f"Soil pH ({ph:.1f}) is below the preferred minimum ({ph_min}).")
        else:
            surplus = ph - ph_max
            ph_score = max(0.0, 1.0 - surplus * 0.4)
            limiting_factors.append(f"Soil pH ({ph:.1f}) exceeds the preferred maximum ({ph_max}).")
    else:
        ph_score = 0.5  # Neutral score when pH unknown
        limiting_factors.append("Soil pH not measured — using neutral estimate.")

    # ── Moisture Compatibility ────────────────────────────────────────────────
    moisture_score = 0.0
    if moisture is not None:
        m_min = req.get("moistureMin", 30)
        m_max = req.get("moistureMax", 70)
        m_opt = req.get("moistureOptimal", (m_min + m_max) / 2)

        if m_min <= moisture <= m_max:
            distance_from_opt = abs(moisture - m_opt)
            range_half = (m_max - m_min) / 2
            moisture_score = 1.0 - (distance_from_opt / (range_half + 1e-6)) * 0.25
            moisture_score = max(0.7, min(1.0, moisture_score))
            matching_factors.append(f"Moisture ({moisture:.0f}%) is within the preferred range ({m_min}–{m_max}%).")
        elif moisture < m_min:
            deficit = m_min - moisture
            moisture_score = max(0.0, 1.0 - deficit * 0.03)
            limiting_factors.append(f"Moisture ({moisture:.0f}%) is below the minimum requirement ({m_min}%).")
        else:
            surplus = moisture - m_max
            moisture_score = max(0.0, 1.0 - surplus * 0.03)
            limiting_factors.append(f"Moisture ({moisture:.0f}%) exceeds the preferred maximum ({m_max}%).")
    else:
        moisture_score = 0.5
        limiting_factors.append("Moisture not measured — using neutral estimate.")

    # ── Fertility Compatibility ───────────────────────────────────────────────
    fertility_required = req.get("fertilityMin", "moderate").lower()
    fertility_order    = {"poor": 0, "moderate": 1, "fertile": 2}
    current_level      = fertility_order.get(fertility_class.lower(), 1)
    required_level     = fertility_order.get(fertility_required, 1)

    if current_level >= required_level:
        # Score based on how much above requirement we are
        surplus = current_level - required_level
        fertility_compat = min(1.0, 0.8 + surplus * 0.1 + fertility_score / 1000)
        matching_factors.append(
            f"Soil fertility ({fertility_class.capitalize()}) meets the minimum requirement ({fertility_required.capitalize()})."
        )
    else:
        deficit = required_level - current_level
        fertility_compat = max(0.0, 0.6 - deficit * 0.25)
        limiting_factors.append(
            f"Soil fertility ({fertility_class.capitalize()}) is below the minimum requirement ({fertility_required.capitalize()})."
        )

    # ── Soil Condition (Visual) ───────────────────────────────────────────────
    condition_scores = {"good": 1.0, "moderate": 0.65, "poor": 0.30}
    soil_cond_score  = condition_scores.get(visual_condition.lower(), 0.65)

    if visual_condition == "good":
        matching_factors.append("Soil visual condition is good.")
    elif visual_condition == "poor":
        limiting_factors.append("Soil visual condition is poor — consider improving soil structure.")

    # ── Location Context ──────────────────────────────────────────────────────
    # All assessed rootcrops are suitable for Roxas region (tropical lowland),
    # so location score stays at default 0.7 unless a crop is specifically
    # marked as unsuitable for the region.
    loc_score = float(crop.get("locationScoreRoxas", location_score))
    if loc_score >= 0.7:
        matching_factors.append("Crop is suitable for the Roxas, Oriental Mindoro region.")

    # ── Weighted Composite Score ──────────────────────────────────────────────
    composite = (
        ph_score       * weights.get("ph",          0.30) +
        moisture_score * weights.get("moisture",    0.20) +
        fertility_compat * weights.get("fertility", 0.25) +
        soil_cond_score * weights.get("soilCondition", 0.15) +
        loc_score       * weights.get("location",   0.10)
    )

    # Convert to 0–100 percentage
    suitability_score = round(min(100.0, max(0.0, composite * 100)), 1)

    # Check minimum threshold
    min_threshold = crop.get("minSuitabilityThreshold", 50)
    meets_threshold = suitability_score >= min_threshold

    return {
        "cropId":           crop.get("cropId"),
        "cropName":         crop.get("cropName"),
        "localName":        crop.get("localName"),
        "suitabilityScore": suitability_score,
        "meetsThreshold":   meets_threshold,
        "minThreshold":     min_threshold,
        "componentScores": {
            "ph":          round(ph_score * 100, 1),
            "moisture":    round(moisture_score * 100, 1),
            "fertility":   round(fertility_compat * 100, 1),
            "soilCondition": round(soil_cond_score * 100, 1),
            "location":    round(loc_score * 100, 1),
        },
        "matchingFactors":  matching_factors,
        "limitingFactors":  limiting_factors,
    }


def _stable_sort(crops: list):
    """
    Secondary sort: if two crops have scores within 1 point, sort alphabetically.
    Ensures consistent output when scores are very close.
    """
    n = len(crops)
    for i in range(n - 1):
        for j in range(i + 1, n):
            if abs(crops[i]["suitabilityScore"] - crops[j]["suitabilityScore"]) <= 1.0:
                if crops[i]["cropName"] > crops[j]["cropName"]:
                    crops[i], crops[j] = crops[j], crops[i]
    # Re-sort by score to preserve primary order
    crops.sort(key=lambda c: c["suitabilityScore"], reverse=True)


def _apply_ranking(scored_crops: list) -> list:
    """
    Assign BEST, SECOND_BEST, NOT_SUITABLE slots.
    Always returns exactly 3 entries (or fewer if <3 crops in DB).

    Special case: if NO crop meets its minimum threshold,
    show the closest option with a warning and mark all as not meeting threshold.
    """
    if not scored_crops:
        return []

    any_meets_threshold = any(c["meetsThreshold"] for c in scored_crops)
    result = []

    for i, crop in enumerate(scored_crops):
        entry = {**crop, "rank": i + 1}

        if i == 0:
            if crop["meetsThreshold"]:
                entry["status"] = "BEST"
                entry["statusLabel"] = "🥇 Best Option"
                entry["recommendedAction"] = (
                    f"Proceed with {crop['cropName']} planting. "
                    f"Apply proper land preparation and nutrient management."
                )
            else:
                entry["status"] = "CLOSEST"
                entry["statusLabel"] = "⚠️ Closest Option (Below Threshold)"
                entry["recommendedAction"] = (
                    f"No crop currently meets the suitability threshold. "
                    f"{crop['cropName']} is the closest option ({crop['suitabilityScore']:.0f}%). "
                    f"Improve soil conditions or consult an extension worker."
                )
        elif i == 1:
            if crop["meetsThreshold"]:
                entry["status"] = "SECOND_BEST"
                entry["statusLabel"] = "🥈 Second Best Option"
                entry["recommendedAction"] = f"Can be considered as an alternative to the best option."
            else:
                entry["status"] = "NOT_SUITABLE"
                entry["statusLabel"] = "🚫 Not Suitable"
                entry["recommendedAction"] = "Soil conditions do not match this crop's requirements."
        else:
            entry["status"] = "NOT_SUITABLE"
            entry["statusLabel"] = "🚫 Not Suitable"
            entry["recommendedAction"] = (
                f"Current soil conditions are not suitable for {crop['cropName']}. "
                f"Consider soil rehabilitation first."
            )

        result.append(entry)

        # Only return 3 results
        if len(result) == 3:
            break

    return result

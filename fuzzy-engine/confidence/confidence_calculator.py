"""
confidence_calculator.py — Assessment confidence scoring

What it does:
    Calculates how confident the system is in its assessment result.

    IMPORTANT: Confidence is NOT classification accuracy.
    It represents how strongly the available inputs support the result.

    A high confidence score means the system had good data to work with.
    A low confidence score means the farmer should validate with lab testing.

How to test:
    from confidence.confidence_calculator import calculate_confidence
    conf = calculate_confidence(has_ph=True, has_moisture=True,
                                image_quality="good", rules_fired=3,
                                dominant_strength=0.85)
    print(conf)
"""


def calculate_confidence(
    has_ph:             bool  = False,
    has_moisture:       bool  = False,
    image_quality:      str   = "moderate",
    rules_fired:        int   = 0,
    dominant_strength:  float = 0.0,
    has_gps:            bool  = True,
    total_rules:        int   = 15,
) -> dict:
    """
    Calculate assessment confidence with explanation.

    Args:
        has_ph:            Whether pH sensor data was available
        has_moisture:      Whether moisture sensor data was available
        image_quality:     "good" | "moderate" | "poor"
        rules_fired:       Number of fuzzy rules that fired
        dominant_strength: Strength of the dominant rule (0–1)
        has_gps:           Whether GPS location was available
        total_rules:       Total rules in the ruleset

    Returns:
        dict with:
            score       float  0–100
            level       str    "high" | "moderate" | "limited"
            factors     list   List of supporting/limiting factor strings
            disclaimer  str    Standard disclaimer text
    """
    score = 30.0  # Minimum base — even image-only gives some signal
    supporting = []
    limiting   = []

    # ── Input Availability ────────────────────────────────────────────────────
    if has_ph:
        score += 22.0
        supporting.append("pH sensor reading available")
    else:
        limiting.append("No pH reading — sensor not connected")

    if has_moisture:
        score += 18.0
        supporting.append("Soil moisture reading available")
    else:
        limiting.append("No moisture reading — sensor not connected")

    # ── Image Quality ─────────────────────────────────────────────────────────
    quality_bonuses = {"good": 12.0, "moderate": 6.0, "poor": 0.0}
    bonus = quality_bonuses.get(image_quality, 6.0)
    score += bonus

    if image_quality == "good":
        supporting.append("Good-quality soil image")
    elif image_quality == "moderate":
        supporting.append("Acceptable soil image quality")
    else:
        limiting.append("Poor image quality — retake under better lighting")

    # ── GPS ───────────────────────────────────────────────────────────────────
    if has_gps:
        score += 5.0
        supporting.append("Valid GPS location")
    else:
        limiting.append("Location unavailable — localized recommendations may be less accurate")

    # ── Fuzzy Rule Agreement ──────────────────────────────────────────────────
    if total_rules > 0:
        rule_ratio = rules_fired / total_rules
        rule_bonus = rule_ratio * 10.0
        score += rule_bonus
        if rules_fired >= 3:
            supporting.append(f"{rules_fired} fuzzy rules in agreement")
        elif rules_fired >= 1:
            supporting.append(f"{rules_fired} fuzzy rule(s) fired")
        else:
            limiting.append("No fuzzy rules fired — unusual input combination")

    # ── Rule Strength ─────────────────────────────────────────────────────────
    score += dominant_strength * 5.0

    # ── Normalize ─────────────────────────────────────────────────────────────
    score = round(min(95.0, max(20.0, score)), 1)

    # ── Level ─────────────────────────────────────────────────────────────────
    if score >= 75:
        level = "high"
        summary = (
            f"High confidence ({score:.0f}%). "
            "The assessment was supported by multiple data sources."
        )
    elif score >= 55:
        level = "moderate"
        summary = (
            f"Moderate confidence ({score:.0f}%). "
            "The assessment is based on partial data. "
            "Connect the ESP32 sensor for a more reliable result."
        )
    else:
        level = "limited"
        summary = (
            f"Limited confidence ({score:.0f}%). "
            "The assessment was based mainly on image-derived features. "
            "For more reliable results, obtain soil pH and moisture readings "
            "and consider laboratory soil analysis."
        )

    return {
        "score":      score,
        "level":      level,
        "summary":    summary,
        "supporting": supporting,
        "limiting":   limiting,
        "disclaimer": (
            "Confidence indicates how strongly the available system inputs support "
            "the current classification. It does NOT indicate laboratory accuracy. "
            "SoilSense is a preliminary assessment tool only."
        ),
    }

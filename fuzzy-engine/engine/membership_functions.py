"""
membership_functions.py — Fuzzy membership function definitions

What it does:
    Defines all fuzzy membership functions for SoilSense inputs and output.
    A membership function converts a crisp (real number) input into a
    degree of membership (0.0–1.0) for each fuzzy set.

    Example:
        pH = 6.2 → membership in "Optimal" = 0.9, in "Acidic" = 0.2

    This module provides PURE FUNCTIONS — no side effects.
    The membership functions are simple trapezoidal/triangular shapes
    for beginner readability, but can be replaced with more complex
    shapes without changing the rest of the engine.

Why configurable ranges matter:
    Different soils in different regions have different optimal pH ranges.
    All threshold values are defined here in one place so a researcher
    can update them without hunting through dozens of files.

How to test:
    from engine.membership_functions import ph_membership, moisture_membership
    print(ph_membership(6.2))
    # Output: {'strongly_acidic': 0.0, 'acidic': 0.0, 'optimal': 1.0, ...}
"""

import numpy as np


# ─── CONFIGURABLE THRESHOLDS ──────────────────────────────────────────────────
# Researchers and admins should update these values based on local standards.
# All values are in the natural units of the parameter.

# pH Thresholds (0–14 scale)
PH_THRESHOLDS = {
    # strongly_acidic: trapezoid — full membership below 4.5, fades 4.5→5.0
    "strongly_acidic":   {"full_low": 0.0,  "full_high": 4.5,  "fade_high": 5.0},
    # acidic: triangle — peaks at 5.25, fades either side
    "acidic":            {"low": 4.5,        "peak": 5.25,      "high": 5.5},
    # slightly_acidic: triangle
    "slightly_acidic":   {"low": 5.0,        "peak": 5.75,      "high": 6.0},
    # optimal: trapezoid — full membership 6.0–7.0
    "optimal":           {"fade_in": 5.5,    "full_low": 6.0,   "full_high": 7.0,  "fade_out": 7.5},
    # slightly_alkaline: triangle
    "slightly_alkaline": {"low": 7.0,        "peak": 7.25,      "high": 7.5},
    # alkaline: trapezoid — full membership above 7.5
    "alkaline":          {"fade_low": 7.0,   "full_low": 7.5,   "full_high": 14.0},
}

# Moisture Thresholds (0–100 %)
MOISTURE_THRESHOLDS = {
    "very_dry": {"full_low": 0.0,  "full_high": 15.0, "fade_high": 25.0},
    "dry":      {"low": 15.0,      "peak": 28.0,       "high": 40.0},
    "moderate": {"fade_in": 30.0,  "full_low": 40.0,  "full_high": 65.0, "fade_out": 75.0},
    "wet":      {"low": 60.0,      "peak": 75.0,       "high": 85.0},
    "very_wet": {"fade_low": 75.0, "full_low": 85.0,  "full_high": 100.0},
}

# Fertility Score Output Thresholds (0–100 scale)
FERTILITY_OUTPUT = {
    "poor":     {"full_low": 0.0,  "full_high": 30.0, "fade_high": 45.0},
    "moderate": {"fade_in": 30.0,  "full_low": 42.0,  "full_high": 65.0, "fade_out": 75.0},
    "fertile":  {"fade_low": 60.0, "full_low": 72.0,  "full_high": 100.0},
}


# ─── MEMBERSHIP FUNCTION SHAPES ───────────────────────────────────────────────

def _trapezoid_low(x: float, full_low: float, full_high: float, fade_high: float) -> float:
    """
    Trapezoid open on the left (for minimum end of a range).
    Full membership (1.0) when x ≤ full_high.
    Fades to 0 between full_high and fade_high.
    """
    if x <= full_high:
        return 1.0
    elif x < fade_high:
        return (fade_high - x) / (fade_high - full_high)
    else:
        return 0.0


def _trapezoid_high(x: float, fade_low: float, full_low: float, full_high: float) -> float:
    """
    Trapezoid open on the right (for maximum end of a range).
    Full membership (1.0) when x ≥ full_low.
    Fades to 0 between fade_low and full_low.
    """
    if x >= full_low:
        return 1.0
    elif x > fade_low:
        return (x - fade_low) / (full_low - fade_low)
    else:
        return 0.0


def _trapezoid(x: float, fade_in: float, full_low: float, full_high: float, fade_out: float) -> float:
    """
    Symmetric trapezoid with flat top and two sloping sides.
    Full membership (1.0) between full_low and full_high.
    """
    if x < fade_in or x > fade_out:
        return 0.0
    elif x <= full_low:
        return (x - fade_in) / (full_low - fade_in)
    elif x <= full_high:
        return 1.0
    else:
        return (fade_out - x) / (fade_out - full_high)


def _triangle(x: float, low: float, peak: float, high: float) -> float:
    """
    Triangle membership function. Full membership (1.0) at peak.
    """
    if x <= low or x >= high:
        return 0.0
    elif x <= peak:
        return (x - low) / (peak - low)
    else:
        return (high - x) / (high - peak)


# ─── pH MEMBERSHIP ────────────────────────────────────────────────────────────

def ph_membership(ph: float) -> dict:
    """
    Compute membership degrees for a soil pH value.

    Args:
        ph: Soil pH value (0–14)

    Returns:
        dict of {fuzzy_set: membership_degree (0.0–1.0)}
    """
    t = PH_THRESHOLDS
    return {
        "strongly_acidic":   _trapezoid_low(ph,
                                t["strongly_acidic"]["full_low"],
                                t["strongly_acidic"]["full_high"],
                                t["strongly_acidic"]["fade_high"]),
        "acidic":            _triangle(ph,
                                t["acidic"]["low"],
                                t["acidic"]["peak"],
                                t["acidic"]["high"]),
        "slightly_acidic":   _triangle(ph,
                                t["slightly_acidic"]["low"],
                                t["slightly_acidic"]["peak"],
                                t["slightly_acidic"]["high"]),
        "optimal":           _trapezoid(ph,
                                t["optimal"]["fade_in"],
                                t["optimal"]["full_low"],
                                t["optimal"]["full_high"],
                                t["optimal"]["fade_out"]),
        "slightly_alkaline": _triangle(ph,
                                t["slightly_alkaline"]["low"],
                                t["slightly_alkaline"]["peak"],
                                t["slightly_alkaline"]["high"]),
        "alkaline":          _trapezoid_high(ph,
                                t["alkaline"]["fade_low"],
                                t["alkaline"]["full_low"],
                                t["alkaline"]["full_high"]),
    }


# ─── MOISTURE MEMBERSHIP ─────────────────────────────────────────────────────

def moisture_membership(moisture: float) -> dict:
    """
    Compute membership degrees for a soil moisture value (0–100%).

    Args:
        moisture: Soil moisture percentage

    Returns:
        dict of {fuzzy_set: membership_degree}
    """
    t = MOISTURE_THRESHOLDS
    return {
        "very_dry": _trapezoid_low(moisture,
                        t["very_dry"]["full_low"],
                        t["very_dry"]["full_high"],
                        t["very_dry"]["fade_high"]),
        "dry":      _triangle(moisture,
                        t["dry"]["low"],
                        t["dry"]["peak"],
                        t["dry"]["high"]),
        "moderate": _trapezoid(moisture,
                        t["moderate"]["fade_in"],
                        t["moderate"]["full_low"],
                        t["moderate"]["full_high"],
                        t["moderate"]["fade_out"]),
        "wet":      _triangle(moisture,
                        t["wet"]["low"],
                        t["wet"]["peak"],
                        t["wet"]["high"]),
        "very_wet": _trapezoid_high(moisture,
                        t["very_wet"]["fade_low"],
                        t["very_wet"]["full_low"],
                        t["very_wet"]["full_high"]),
    }


# ─── VISUAL CONDITION MEMBERSHIP ─────────────────────────────────────────────

def visual_condition_membership(condition: str) -> dict:
    """
    Membership for visual soil condition (categorical input from image processing).
    Uses crisp assignment since the image processor already classified it.

    Args:
        condition: "good" | "moderate" | "poor"

    Returns:
        dict of {fuzzy_set: degree}
    """
    condition = condition.lower() if condition else "moderate"
    mapping = {
        "good":     {"good": 1.0,  "moderate": 0.0, "poor": 0.0},
        "moderate": {"good": 0.25, "moderate": 1.0, "poor": 0.25},
        "poor":     {"good": 0.0,  "moderate": 0.0, "poor": 1.0},
    }
    return mapping.get(condition, mapping["moderate"])


# ─── FERTILITY OUTPUT MEMBERSHIP ─────────────────────────────────────────────

def fertility_output_membership(score: float) -> dict:
    """
    Map a crisp fertility score (0–100) to fuzzy membership.
    Used for defuzzification via centroid method.

    Args:
        score: 0–100 fertility score

    Returns:
        dict with membership per class
    """
    t = FERTILITY_OUTPUT
    return {
        "poor":     _trapezoid_low(score,
                        t["poor"]["full_low"],
                        t["poor"]["full_high"],
                        t["poor"]["fade_high"]),
        "moderate": _trapezoid(score,
                        t["moderate"]["fade_in"],
                        t["moderate"]["full_low"],
                        t["moderate"]["full_high"],
                        t["moderate"]["fade_out"]),
        "fertile":  _trapezoid_high(score,
                        t["fertile"]["fade_low"],
                        t["fertile"]["full_low"],
                        t["fertile"]["full_high"]),
    }


def get_dominant_ph_set(ph: float) -> str:
    """Return the fuzzy set with the highest membership for a given pH."""
    memberships = ph_membership(ph)
    return max(memberships, key=memberships.get)


def get_dominant_moisture_set(moisture: float) -> str:
    """Return the fuzzy set with the highest membership for a given moisture %."""
    memberships = moisture_membership(moisture)
    return max(memberships, key=memberships.get)

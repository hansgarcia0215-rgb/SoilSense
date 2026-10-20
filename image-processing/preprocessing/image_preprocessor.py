"""
image_preprocessor.py — Soil image preprocessing pipeline

What it does:
    1. Decodes the raw image bytes received from the backend
    2. Resizes to a standard working resolution
    3. Checks image quality (brightness, blur, exposure, resolution)
    4. Returns the preprocessed image + quality report

Why it exists:
    Raw smartphone photos vary widely in size, lighting, and quality.
    Standardizing them before feature extraction improves consistency.

How to test:
    from preprocessing.image_preprocessor import preprocess_image
    result = preprocess_image(image_bytes)
    print(result['quality'])
"""

import cv2
import numpy as np
from PIL import Image
import io


# ─── Constants ───────────────────────────────────────────────────────────────
# Working resolution — all images are resized to this before feature extraction.
# 512x512 is large enough for color/texture analysis but fast enough for cloud.
TARGET_SIZE = (512, 512)

# Quality thresholds — configurable here instead of hard-coded deep in logic
QUALITY_THRESHOLDS = {
    "min_brightness": 40,       # Below this → image is too dark
    "max_brightness": 220,      # Above this → image is overexposed
    "min_sharpness": 80.0,      # Laplacian variance — below this → blurry
    "min_resolution_px": 200,   # Minimum dimension in pixels
}


def preprocess_image(image_bytes: bytes) -> dict:
    """
    Preprocess a raw soil image.

    Args:
        image_bytes: Raw image bytes (JPEG or PNG)

    Returns:
        dict with keys:
            success       bool
            image_array   np.ndarray | None  — preprocessed BGR image (512x512)
            image_rgb     np.ndarray | None  — RGB version of above
            original_size tuple | None        — (width, height) of original
            quality       dict               — quality report
            error         str | None
    """
    try:
        # ── Decode image ─────────────────────────────────────────────────────
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return _failure("Unable to decode image. Please upload a valid JPEG or PNG.")

        original_h, original_w = img_bgr.shape[:2]

        # ── Minimum resolution check ──────────────────────────────────────────
        if original_w < QUALITY_THRESHOLDS["min_resolution_px"] or \
           original_h < QUALITY_THRESHOLDS["min_resolution_px"]:
            return _failure(
                f"Image resolution is too low ({original_w}×{original_h}). "
                f"Please capture a higher-resolution photo."
            )

        # ── Resize to standard working size ───────────────────────────────────
        img_resized = cv2.resize(img_bgr, TARGET_SIZE, interpolation=cv2.INTER_AREA)

        # ── Assess image quality ──────────────────────────────────────────────
        quality = _assess_quality(img_resized)

        # If quality is "poor", still return the image but flag it
        # The caller decides whether to reject or warn

        # ── Convert to RGB (OpenCV uses BGR by default) ───────────────────────
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

        return {
            "success":       True,
            "image_array":   img_resized,   # BGR — used by OpenCV functions
            "image_rgb":     img_rgb,       # RGB — used for display / PIL
            "original_size": (original_w, original_h),
            "quality":       quality,
            "error":         None,
        }

    except Exception as e:
        return _failure(f"Image preprocessing error: {str(e)}")


def _assess_quality(img_bgr: np.ndarray) -> dict:
    """
    Calculate quality metrics and determine overall quality level.

    Returns:
        dict with overall_quality, score, brightness, sharpness, issues
    """
    issues = []

    # ── Brightness ────────────────────────────────────────────────────────────
    # Convert to grayscale and compute mean pixel intensity (0–255)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))

    if brightness < QUALITY_THRESHOLDS["min_brightness"]:
        issues.append({
            "issue": "Image is too dark.",
            "suggestion": "Retake the soil image under better lighting conditions."
        })
    elif brightness > QUALITY_THRESHOLDS["max_brightness"]:
        issues.append({
            "issue": "Image is overexposed.",
            "suggestion": "Avoid direct sunlight on the soil sample when capturing."
        })

    # ── Sharpness (Laplacian variance) ────────────────────────────────────────
    # High variance = sharp image; Low variance = blurry image
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_32F).var())

    if laplacian_var < QUALITY_THRESHOLDS["min_sharpness"]:
        issues.append({
            "issue": "Image appears blurry.",
            "suggestion": "Hold the phone steady and ensure the soil is in focus."
        })

    # ── Exposure check (percentage of near-black and near-white pixels) ───────
    total_pixels = gray.size
    pct_dark  = float(np.sum(gray < 30)  / total_pixels * 100)
    pct_light = float(np.sum(gray > 230) / total_pixels * 100)

    if pct_dark > 40:
        issues.append({
            "issue": "More than 40% of the image is very dark.",
            "suggestion": "Take the photo in a well-lit area. Avoid shadows."
        })
    if pct_light > 40:
        issues.append({
            "issue": "More than 40% of the image is very bright.",
            "suggestion": "Reduce glare by moving out of direct sunlight."
        })

    # ── Overall quality score (simple weighted rule) ──────────────────────────
    # Start at 100, deduct for each issue
    score = 100 - (len(issues) * 20)

    # Sharpness bonus/penalty
    if laplacian_var >= 300:
        score = min(100, score + 10)  # Very sharp — bonus
    elif laplacian_var < QUALITY_THRESHOLDS["min_sharpness"]:
        score = max(0, score - 10)

    score = max(0, min(100, score))

    # Map score to category
    if score >= 75:
        overall = "good"
    elif score >= 50:
        overall = "moderate"
    else:
        overall = "poor"

    return {
        "overall_quality":   overall,
        "quality_score":     round(score / 100, 2),
        "brightness":        round(brightness, 2),
        "sharpness":         round(laplacian_var, 2),
        "pct_dark_pixels":   round(pct_dark, 1),
        "pct_light_pixels":  round(pct_light, 1),
        "issues":            issues,
        "issue_count":       len(issues),
    }


def _failure(message: str) -> dict:
    """Return a standardized failure result."""
    return {
        "success":       False,
        "image_array":   None,
        "image_rgb":     None,
        "original_size": None,
        "quality":       {"overall_quality": "poor", "quality_score": 0, "issues": []},
        "error":         message,
    }

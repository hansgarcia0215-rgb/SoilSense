"""
color_features.py — Extract color-based features from a preprocessed soil image

What it does:
    Extracts numerical color features from the soil image across multiple
    color spaces (RGB, HSV, LAB). These features become inputs to the
    fuzzy logic engine as indirect indicators of soil condition.

    IMPORTANT LIMITATION:
    Color features are INDIRECT INDICATORS only. Soil color is influenced
    by lighting, camera settings, soil moisture, and local soil type.
    Dark soil does not automatically mean fertile soil.
    These features must be combined with pH/moisture/GPS context.

How to test:
    from feature_extraction.color_features import extract_color_features
    features = extract_color_features(img_bgr_array)
    print(features)
"""

import cv2
import numpy as np


def extract_color_features(img_bgr: np.ndarray) -> dict:
    """
    Extract comprehensive color features from a BGR soil image.

    Args:
        img_bgr: Preprocessed BGR numpy array (512x512)

    Returns:
        dict of color feature values
    """
    # ── RGB features ─────────────────────────────────────────────────────────
    # Convert BGR (OpenCV default) to RGB for human-readable channel order
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    r_channel = img_rgb[:, :, 0].astype(np.float32)
    g_channel = img_rgb[:, :, 1].astype(np.float32)
    b_channel = img_rgb[:, :, 2].astype(np.float32)

    avg_r = float(np.mean(r_channel))
    avg_g = float(np.mean(g_channel))
    avg_b = float(np.mean(b_channel))
    std_r = float(np.std(r_channel))
    std_g = float(np.std(g_channel))
    std_b = float(np.std(b_channel))

    # Overall brightness (simple average of all channels)
    avg_brightness = float(np.mean(img_rgb))

    # ── HSV features ─────────────────────────────────────────────────────────
    # H=Hue (0–180 in OpenCV), S=Saturation (0–255), V=Value/Brightness (0–255)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = img_hsv[:,:,0], img_hsv[:,:,1], img_hsv[:,:,2]

    avg_hue        = float(np.mean(h)) * 2      # Scale to 0–360 degrees
    avg_saturation = float(np.mean(s)) / 255     # Normalize to 0–1
    avg_value      = float(np.mean(v)) / 255     # Normalize to 0–1
    std_hue        = float(np.std(h))  * 2
    std_saturation = float(np.std(s))  / 255

    # ── LAB features ─────────────────────────────────────────────────────────
    # L=Lightness, A=Green-Red axis, B=Blue-Yellow axis
    # LAB is designed to be perceptually uniform — good for soil color analysis
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    l_chan = img_lab[:, :, 0]
    a_chan = img_lab[:, :, 1]
    b_chan = img_lab[:, :, 2]

    avg_L = float(np.mean(l_chan))
    avg_A = float(np.mean(a_chan)) - 128   # Center around 0 (OpenCV offsets LAB by 128)
    avg_B_lab = float(np.mean(b_chan)) - 128

    # ── Derived soil-relevant indicators ─────────────────────────────────────

    # Redness Index — red soils can indicate iron-rich lateritic soils
    # Formula: R / (G + B) — higher values = more reddish
    redness_index = avg_r / (avg_g + avg_b + 1e-6)

    # Darkness Index — relative darkness of the soil
    # Darker soils OFTEN (not always) correlate with higher organic matter
    # Range 0 (very dark) to 1 (very bright)
    darkness_index = 1.0 - (avg_brightness / 255.0)

    # Color Uniformity — low std across channels indicates uniform soil sample
    color_uniformity = 1.0 - (
        (std_r + std_g + std_b) / (3 * 255.0)
    )

    # Brown Soil Index — approximates the degree of brown/earth tones
    # Soil tends to have R > G > B, R-G small, G-B larger
    brown_index = (avg_r - avg_b) / (avg_r + avg_b + 1e-6)

    # ── Compile results ───────────────────────────────────────────────────────
    return {
        # RGB raw averages
        "avg_R":            round(avg_r, 2),
        "avg_G":            round(avg_g, 2),
        "avg_B":            round(avg_b, 2),
        "std_R":            round(std_r, 2),
        "std_G":            round(std_g, 2),
        "std_B":            round(std_b, 2),

        # HSV
        "avg_hue_deg":      round(avg_hue, 2),        # 0–360 degrees
        "avg_saturation":   round(avg_saturation, 3),  # 0–1
        "avg_value":        round(avg_value, 3),       # 0–1
        "std_hue":          round(std_hue, 2),
        "std_saturation":   round(std_saturation, 3),

        # LAB
        "lab_L":            round(avg_L, 2),
        "lab_A":            round(avg_A, 2),
        "lab_B":            round(avg_B_lab, 2),

        # Derived indicators
        "avg_brightness":   round(avg_brightness, 2),  # 0–255
        "darkness_index":   round(darkness_index, 3),  # 0–1, 1=very dark
        "redness_index":    round(redness_index, 3),
        "brown_index":      round(brown_index, 3),
        "color_uniformity": round(color_uniformity, 3),
    }

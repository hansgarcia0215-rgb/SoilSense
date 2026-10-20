"""
texture_features.py — Extract texture features from a preprocessed soil image

What it does:
    Extracts texture-based features using:
    - Local standard deviation (texture roughness)
    - Laplacian-based contrast
    - Gradient magnitude (edge density)
    - Entropy approximation (information content)

    These texture features help distinguish:
    - Coarse/rough soil vs. fine/smooth soil
    - Cracked/dry soil vs. moist/compact soil

Why NOT using GLCM (Gray-Level Co-occurrence Matrix):
    GLCM is the gold standard for texture analysis but requires
    scikit-image and is computationally expensive for real-time cloud use.
    A simpler gradient/variance approach is used here for speed.
    scikit-image GLCM can be enabled by uncommenting the optional section.

How to test:
    from feature_extraction.texture_features import extract_texture_features
    features = extract_texture_features(img_bgr_array)
    print(features)
"""

import cv2
import numpy as np


def extract_texture_features(img_bgr: np.ndarray) -> dict:
    """
    Extract texture features from a BGR soil image.

    Args:
        img_bgr: Preprocessed BGR numpy array (512x512)

    Returns:
        dict of texture feature values
    """
    # Convert to grayscale — texture analysis works on intensity
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # ── 1. Local Standard Deviation (Texture Roughness) ──────────────────────
    # Measures how much pixel intensity varies in local neighborhoods.
    # High local_std → rough/heterogeneous texture (gravelly, cracked soil)
    # Low  local_std → smooth/homogeneous texture (fine-grained or wet soil)
    kernel_size = 15
    mean_local = cv2.blur(gray, (kernel_size, kernel_size))
    sq_mean    = cv2.blur(gray**2, (kernel_size, kernel_size))
    local_var  = sq_mean - mean_local**2
    local_var  = np.maximum(local_var, 0)  # Numerical safety
    local_std  = np.sqrt(local_var)

    avg_local_std = float(np.mean(local_std))
    max_local_std = float(np.max(local_std))

    # ── 2. Laplacian Contrast ────────────────────────────────────────────────
    # Second-order derivative — highlights rapid intensity changes (edges).
    # High contrast → more visible texture, edges, cracks
    laplacian     = cv2.Laplacian(gray, cv2.CV_32F)
    contrast      = float(laplacian.var())
    mean_abs_lap  = float(np.mean(np.abs(laplacian)))

    # ── 3. Gradient Magnitude (Edge Density) ─────────────────────────────────
    # Sobel filter detects edges in x and y directions.
    # High gradient → many edges/boundaries in soil image (e.g., cracks, debris)
    sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient_magnitude = np.sqrt(sobelx**2 + sobely**2)
    avg_gradient  = float(np.mean(gradient_magnitude))
    max_gradient  = float(np.max(gradient_magnitude))
    edge_density  = float(np.mean(gradient_magnitude > 50))  # Fraction of "edge pixels"

    # ── 4. Entropy Approximation ──────────────────────────────────────────────
    # Shannon entropy of the histogram measures information content.
    # High entropy → many different intensity values (complex texture)
    # Low  entropy → few different intensities (uniform/flat surface)
    hist = cv2.calcHist([gray.astype(np.uint8)], [0], None, [256], [0, 256])
    hist_norm = hist.ravel() / (hist.ravel().sum() + 1e-6)
    # Only count non-zero bins to avoid log(0)
    non_zero = hist_norm[hist_norm > 0]
    entropy = float(-np.sum(non_zero * np.log2(non_zero)))

    # ── 5. Homogeneity Approximation ──────────────────────────────────────────
    # Inverse of contrast — high homogeneity means smooth, uniform surface.
    # Normalized so 1.0 = completely homogeneous
    homogeneity = 1.0 / (1.0 + mean_abs_lap / 100.0)

    # ── 6. Visual Soil Condition Score ────────────────────────────────────────
    # Combine texture features into a single 0–1 score for the fuzzy engine.
    # This represents the overall "soil visual condition" fuzzy input.
    #
    # Logic:
    #   - Low contrast + low gradient + moderate entropy = uniform, healthy-looking soil
    #   - Very high contrast/gradient = rough, possibly degraded, debris-heavy
    #   - Very low entropy = featureless (possible poor image, not soil)
    #
    # This is a heuristic — adjust weights based on field validation.

    # Normalize components to 0–1
    contrast_norm   = min(contrast / 10000.0, 1.0)    # Typical range 0–10000
    gradient_norm   = min(avg_gradient / 150.0, 1.0)  # Typical range 0–150
    entropy_norm    = entropy / 8.0                     # Max theoretical entropy ~8 bits

    # Optimal: moderate entropy, low-moderate contrast, low edge density
    entropy_score   = 1.0 - abs(entropy_norm - 0.55)  # Optimal around 4.4 bits
    contrast_score  = 1.0 - min(contrast_norm, 1.0)
    gradient_score  = 1.0 - gradient_norm

    visual_score = (
        entropy_score  * 0.35 +
        contrast_score * 0.35 +
        gradient_score * 0.30
    )
    visual_score = max(0.0, min(1.0, visual_score))

    # Map to fuzzy set label
    if visual_score >= 0.65:
        visual_condition = "good"
    elif visual_score >= 0.35:
        visual_condition = "moderate"
    else:
        visual_condition = "poor"

    return {
        # Local variance texture roughness
        "avg_local_std":    round(avg_local_std, 3),
        "max_local_std":    round(max_local_std, 3),

        # Laplacian contrast
        "texture_contrast": round(contrast, 3),
        "mean_abs_laplacian": round(mean_abs_lap, 3),

        # Gradient/edge
        "avg_gradient":     round(avg_gradient, 3),
        "max_gradient":     round(max_gradient, 3),
        "edge_density":     round(edge_density, 4),

        # Entropy
        "entropy":          round(entropy, 3),

        # Homogeneity (derived)
        "homogeneity":      round(homogeneity, 3),

        # Derived soil visual score (0–1) and fuzzy label
        "visual_score":     round(visual_score, 3),
        "visual_condition": visual_condition,  # "good" | "moderate" | "poor"
    }

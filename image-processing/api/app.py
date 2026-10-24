"""
app.py — Image Processing Microservice (Flask API)

What it does:
    Runs a small Flask web server that:
    1. Receives a soil image from the Node.js backend
    2. Preprocesses the image (resize, quality check)
    3. Extracts color features (RGB, HSV, LAB)
    4. Extracts texture features (contrast, homogeneity, entropy)
    5. Returns all features + quality report as JSON

Why a separate Python service?
    Node.js does not have good native image processing libraries.
    Python + OpenCV is the industry standard for image analysis.
    Separating this as a microservice means it can be improved or
    replaced independently without touching the main backend.

How to run (from /image-processing directory):
    pip install -r requirements.txt
    python api/app.py

Expected result:
    Image processing service running on port 5001
    Health check: GET http://localhost:5001/health

How to test with curl:
    curl -X POST http://localhost:5001/analyze \
         -F "image=@/path/to/soil.jpg"
"""

import sys
import os
import hmac

# Add parent directory to Python path so we can import from sibling packages
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, jsonify
from flask_cors import CORS
import time

from preprocessing.image_preprocessor import preprocess_image
from feature_extraction.color_features import extract_color_features
from feature_extraction.texture_features import extract_texture_features

app = Flask(__name__)

# Allow requests from the Node.js backend
CORS(app, origins=["http://localhost:3001", "http://localhost:5173"])

@app.before_request
def require_service_api_key():
    if request.endpoint == 'health':
        return None

    expected_key = os.environ.get('SERVICE_API_KEY')
    if not expected_key:
        if os.environ.get('REQUIRE_SERVICE_API_KEY', '').lower() == 'true':
            return jsonify({
                "success": False,
                "error": "SERVICE_AUTH_NOT_CONFIGURED",
                "message": "The service API key is not configured.",
            }), 503
        return None

    provided_key = request.headers.get('X-Service-Api-Key', '')
    if not hmac.compare_digest(provided_key, expected_key):
        return jsonify({
            "success": False,
            "error": "UNAUTHORIZED",
            "message": "A valid service API key is required.",
        }), 401


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "success": True,
        "service": "SoilSense Image Processing",
        "status":  "running",
        "version": "1.0.0",
    })


# ─── Main Analysis Endpoint ───────────────────────────────────────────────────
@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze a soil image and return features + quality report.

    Request: multipart/form-data with field "image" (JPEG or PNG)

    Response JSON:
    {
        "success": true,
        "processingTimeMs": 320,
        "quality": { "overall_quality": "good", "quality_score": 0.85, ... },
        "colorFeatures": { "avg_R": 135, "avg_hue_deg": 42, ... },
        "textureFeatures": { "texture_contrast": 0.38, "visual_condition": "good", ... },
        "derivedInputs": {
            "visual_condition": "good",    ← This becomes a fuzzy input
            "visual_score": 0.72
        }
    }
    """
    start_time = time.time()

    # ── Validate request ──────────────────────────────────────────────────────
    if 'image' not in request.files:
        return jsonify({
            "success": False,
            "error":   "NO_IMAGE",
            "message": "No image file found in request. Send as multipart/form-data with field 'image'."
        }), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({
            "success": False,
            "error":   "EMPTY_FILENAME",
            "message": "No file selected."
        }), 400

    # ── Read image bytes ───────────────────────────────────────────────────────
    image_bytes = image_file.read()

    if len(image_bytes) == 0:
        return jsonify({
            "success": False,
            "error":   "EMPTY_FILE",
            "message": "The uploaded file is empty."
        }), 400

    # ── Preprocess ────────────────────────────────────────────────────────────
    preprocess_result = preprocess_image(image_bytes)

    if not preprocess_result["success"]:
        return jsonify({
            "success": False,
            "error":   "PREPROCESS_FAILED",
            "message": preprocess_result["error"],
            "quality": preprocess_result["quality"],
        }), 422

    # ── Quality gate ──────────────────────────────────────────────────────────
    # If image quality is "poor", return a warning but still process.
    # The fuzzy engine will factor quality into the confidence score.
    quality = preprocess_result["quality"]
    quality_warning = None
    if quality["overall_quality"] == "poor":
        quality_warning = {
            "level":   "warning",
            "message": "Image quality is poor. Results may be less reliable.",
            "issues":  quality["issues"],
        }

    img_bgr = preprocess_result["image_array"]

    # ── Feature Extraction ────────────────────────────────────────────────────
    try:
        color_features   = extract_color_features(img_bgr)
        texture_features = extract_texture_features(img_bgr)
    except Exception as e:
        return jsonify({
            "success": False,
            "error":   "FEATURE_EXTRACTION_FAILED",
            "message": f"Feature extraction failed: {str(e)}",
        }), 500

    # ── Timing ────────────────────────────────────────────────────────────────
    processing_time_ms = round((time.time() - start_time) * 1000)

    # ── Build response ────────────────────────────────────────────────────────
    response = {
        "success":           True,
        "processingTimeMs":  processing_time_ms,
        "originalSize":      preprocess_result["original_size"],
        "workingSize":       [512, 512],
        "quality":           quality,
        "qualityWarning":    quality_warning,
        "colorFeatures":     color_features,
        "textureFeatures":   texture_features,

        # Derived inputs — directly usable by the fuzzy logic engine
        "derivedInputs": {
            # Visual condition fuzzy label: "good" | "moderate" | "poor"
            "visual_condition":  texture_features["visual_condition"],
            "visual_score":      texture_features["visual_score"],
            # Image quality affects the confidence score
            "image_quality":     quality["overall_quality"],
            "image_quality_score": quality["quality_score"],
        },
    }

    return jsonify(response), 200


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('IMAGE_PROCESSING_PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'

    print(f"\n🖼️  [SoilSense] Image Processing Service")
    print(f"   Running on port {port}")
    print(f"   Health check: http://localhost:{port}/health\n")

    app.run(host='0.0.0.0', port=port, debug=debug)

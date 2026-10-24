"""
app.py — Fuzzy Logic Engine Microservice (Flask API)

What it does:
    Runs a Flask web server that receives soil features and returns:
    - Soil Fertility Result (classification + score + confidence)
    - Crop Recommendation (BEST / SECOND-BEST / NOT SUITABLE)
    - Fertilizer recommendation key

Data flow:
    Soil inputs → Mamdani fuzzy inference → SOIL FERTILITY RESULT
                                                      ↓
                            Crop suitability engine (uses fertility result)
                                                      ↓
                          BEST CROP / SECOND-BEST CROP / NOT SUITABLE CROP

How to run (from /fuzzy-engine directory):
    pip install -r requirements.txt
    python api/app.py

Health check: GET http://localhost:5002/health
"""

import sys
import os
import hmac
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, jsonify
from flask_cors import CORS

from engine.fuzzy_inference    import infer_fertility, BUILTIN_RULES
from engine.crop_engine        import rank_crops          # NEW: fruit/tree crop engine
from confidence.confidence_calculator import calculate_confidence

app = Flask(__name__)
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


@app.route('/health', methods=['GET'])
def health():
    requires_key = os.environ.get('REQUIRE_SERVICE_API_KEY', '').lower() == 'true'
    is_ready = not requires_key or bool(os.environ.get('SERVICE_API_KEY'))
    return jsonify({
        "success": True,
        "service": "SoilSense Fuzzy Logic Engine",
        "status":  "running" if is_ready else "not_ready",
        "ready": is_ready,
        "message": None if is_ready else "SERVICE_API_KEY is not configured.",
        "version": "2.0.0",
    })


@app.route('/infer', methods=['POST'])
def infer():
    """
    Run fuzzy soil fertility inference, then rank crops based on the result.

    IMPORTANT: Crop recommendation is DRIVEN BY the soil fertility result.
    The fuzzy engine produces fertilityClass + fertilityScore FIRST,
    then rank_crops() uses those values as its primary scoring input.

    Request JSON:
    {
        "ph":              6.2,        // optional — from sensor or manual entry
        "moisture":        57,         // optional — from sensor or manual entry
        "visualCondition": "good",     // from image processing service
        "imageQuality":    "good",     // from image processing service
        "hasGPS":          true,
        "crops":           [...],      // crop list from Firestore
        "rules":           [...],      // fuzzy rules from Firestore (optional)
        "returnTopN":      3           // how many crop results to return (default 3)
    }

    Response JSON:
    {
        "success": true,
        "fertility": {
            "classification": "moderate",
            "score":          68,
            "confidence":     82,
            ...
        },
        "cropRecommendations": [    // <- driven by fertility result
            { "rank": 1, "status": "BEST",         "cropName": "...", ... },
            { "rank": 2, "status": "SECOND_BEST",  "cropName": "...", ... },
            { "rank": 3, "status": "NOT_SUITABLE", "cropName": "...", ... }
        ],
        "fertilizerRecommendationKey": "fert-moderate-general"
    }
    """
    start_time = time.time()
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "error":   "NO_DATA",
            "message": "Request body must be JSON."
        }), 400

    # ── Extract inputs ────────────────────────────────────────────────────────
    ph               = data.get("ph")
    moisture         = data.get("moisture")
    visual_condition = data.get("visualCondition", "moderate")
    image_quality    = data.get("imageQuality",    "moderate")
    has_gps          = data.get("hasGPS",          False)
    crops            = data.get("crops",           [])
    rules            = data.get("rules",           None)
    return_top_n     = int(data.get("returnTopN",  3))

    # ── Validate sensor inputs ────────────────────────────────────────────────
    if ph is not None:
        try:
            ph = float(ph)
            if not (0.0 <= ph <= 14.0):
                return jsonify({"success": False, "error": "INVALID_PH",
                                "message": "pH must be between 0 and 14."}), 422
        except (TypeError, ValueError):
            ph = None

    if moisture is not None:
        try:
            moisture = float(moisture)
            if not (0.0 <= moisture <= 100.0):
                return jsonify({"success": False, "error": "INVALID_MOISTURE",
                                "message": "Moisture must be between 0 and 100."}), 422
        except (TypeError, ValueError):
            moisture = None

    # ── STEP 1: FUZZY INFERENCE → SOIL FERTILITY RESULT ──────────────────────
    # This produces the fertility class and score that drives all crop recommendations.
    try:
        fuzzy_result = infer_fertility(
            ph=ph,
            moisture=moisture,
            visual_condition=visual_condition,
            rules=rules,
        )
    except Exception as e:
        return jsonify({
            "success": False,
            "error":   "INFERENCE_ERROR",
            "message": f"Fuzzy inference failed: {str(e)}"
        }), 500

    # ── Calculate confidence ──────────────────────────────────────────────────
    confidence_result = calculate_confidence(
        has_ph=ph is not None,
        has_moisture=moisture is not None,
        image_quality=image_quality,
        rules_fired=len(fuzzy_result.get("activatedRules", [])),
        dominant_strength=max(fuzzy_result.get("aggregation", {}).values() or [0]),
        has_gps=has_gps,
        total_rules=len(rules) if rules else len(BUILTIN_RULES),
    )

    # ── STEP 2: CROP RANKING (driven by fertility result) ─────────────────────
    # rank_crops receives fertilityClass and fertilityScore from the fuzzy result.
    # It uses these as the PRIMARY scoring factor for every crop.
    crop_recommendations = []   # Top N (BEST/SECOND_BEST/NOT_SUITABLE) for the main cards
    all_crops_ranked    = []   # ALL crops scored, for the full expandable list
    if crops:
        try:
            crop_recommendations = rank_crops(
                ph=ph,
                moisture=moisture,
                fertility_class=fuzzy_result["fertilityClass"],   # ← from fuzzy result
                fertility_score=fuzzy_result["fertilityScore"],   # ← from fuzzy result
                visual_condition=visual_condition,
                crops=crops,
                return_top_n=return_top_n,
            )
            # Full ranked list of every crop (return_top_n = len(crops))
            all_crops_ranked = rank_crops(
                ph=ph,
                moisture=moisture,
                fertility_class=fuzzy_result["fertilityClass"],
                fertility_score=fuzzy_result["fertilityScore"],
                visual_condition=visual_condition,
                crops=crops,
                return_top_n=len(crops),
            )
        except Exception as e:
            # Crop ranking failure is non-fatal — fertility result still returned
            print(f"[Fuzzy API] Crop ranking error: {e}")
            crop_recommendations = []
            all_crops_ranked = []

    # ── Fertilizer recommendation key ─────────────────────────────────────────
    fert_class = fuzzy_result["fertilityClass"]
    best_crop  = crop_recommendations[0]["cropId"] if crop_recommendations else "general"
    fert_key   = f"fert-{fert_class}-{best_crop}"
    fert_fallback = f"fert-{fert_class}-general"

    processing_ms = round((time.time() - start_time) * 1000)

    return jsonify({
        "success":          True,
        "processingTimeMs": processing_ms,

        # Soil Fertility Result
        "fertility": {
            "classification":   fuzzy_result["fertilityClass"],
            "score":            fuzzy_result["fertilityScore"],
            "confidence":       confidence_result["score"],
            "confidenceLevel":  confidence_result["level"],
            "phFuzzySet":       fuzzy_result.get("phFuzzySet"),
            "moistureFuzzySet": fuzzy_result.get("moistureFuzzySet"),
            "activatedRules":   fuzzy_result.get("activatedRules", []),
            "aggregation":      fuzzy_result.get("aggregation", {}),
            "explanation":      fuzzy_result.get("explanation", ""),
            "explanationList":  fuzzy_result.get("explanationList", []),
        },

        "confidence": confidence_result,

        # Crop Recommendations — driven by the fertility result above
        "cropRecommendations": crop_recommendations,

        # Full ranked list of ALL evaluated crops (for the expandable list)
        "allCropsRanked": all_crops_ranked,

        # Legacy key kept for backward compatibility with orchestrator
        "rootcrops": crop_recommendations,

        "fertilizerRecommendationKey": fert_key,
        "fertilizerFallbackKey":       fert_fallback,
        "inputsUsed": fuzzy_result.get("inputsUsed", {}),
    }), 200


if __name__ == '__main__':
    port  = int(os.environ.get('FUZZY_ENGINE_PORT', 5002))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'
    print(f"\n🧠 [SoilSense] Fuzzy Logic Engine v2.0")
    print(f"   Crop recommendation driven by soil fertility result")
    print(f"   Running on port {port}")
    print(f"   Health check: http://localhost:{port}/health\n")
    app.run(host='0.0.0.0', port=port, debug=debug)

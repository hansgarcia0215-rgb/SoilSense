/**
 * seed.js — Database seed script
 *
 * What it does:
 *   Populates Firestore with realistic demo data so the application
 *   works immediately after installation without any manual data entry.
 *
 * What it creates:
 *   - 5 rootcrop records with configurable requirements
 *   - Fuzzy rule set
 *   - Agricultural standards
 *   - Fertilizer recommendation templates
 *   - 3 sample assessments with full results
 *   - System settings / counters
 *
 * IMPORTANT:
 *   All data is clearly labeled as DEMO / CONFIGURABLE.
 *   Agricultural values are based on general agronomy literature
 *   and must be verified and updated by a qualified agricultural
 *   extension officer before use in production.
 *
 * How to run (from the /backend directory):
 *   node ../database/seed/seed.js
 *
 * Prerequisite:
 *   Set FIREBASE_* variables in backend/.env before running.
 */

require('dotenv').config({ path: `${__dirname}/../../backend/.env` });

const { db }     = require('../../backend/src/firebase/admin');

// ─── Helper ───────────────────────────────────────────────────

async function seedCollection(collectionName, documents, idField = null) {
  console.log(`\nSeeding ${collectionName}...`);
  const batch = db.batch();
  for (const doc of documents) {
    const ref = idField
      ? db.collection(collectionName).doc(doc[idField])
      : db.collection(collectionName).doc();
    batch.set(ref, doc);
  }
  await batch.commit();
  console.log(`  ✓ ${documents.length} document(s) written`);
}

// ─── 1. CROPS ─────────────────────────────────────────────────

async function seedCrops() {
  // NOTE: pH ranges and requirements below are based on general agronomy
  // literature for tropical conditions. Verify with local DA/PhilRice data.
  const crops = [
    {
      cropId:       'cassava',
      cropName:     'Cassava',
      localName:    'Kamoteng Kahoy',
      category:     'Root Crop',
      family:       'Euphorbiaceae',
      description:  'Drought-tolerant root crop. Widely grown across Oriental Mindoro.',
      isActive:     true,
      isDemoData:   true,
      dataSource:   'DEMO — Verify with DA-MIMAROPA Extension Office',
      requirements: {
        phMin:            5.5,
        phMax:            7.0,
        phOptimal:        6.2,
        moistureMin:      30,
        moistureMax:      70,
        moistureOptimal:  50,
        fertilityMin:     'moderate',
        drainagePreference: 'well-drained',
        soilTexturePreference: 'loamy to sandy loam',
        notes: 'Tolerates poor soils but yields best in fertile well-drained loam.',
      },
      suitabilityWeights: {
        ph:          0.30,
        moisture:    0.20,
        fertility:   0.25,
        soilCondition: 0.15,
        location:    0.10,
      },
      minSuitabilityThreshold: 50,
    },
    {
      cropId:       'sweet_potato',
      cropName:     'Sweet Potato',
      localName:    'Kamote',
      category:     'Root Crop',
      family:       'Convolvulaceae',
      description:  'Fast-maturing, nutritious root crop. Excellent for smallholder farms.',
      isActive:     true,
      isDemoData:   true,
      dataSource:   'DEMO — Verify with DA-MIMAROPA Extension Office',
      requirements: {
        phMin:            5.5,
        phMax:            6.8,
        phOptimal:        6.0,
        moistureMin:      40,
        moistureMax:      75,
        moistureOptimal:  60,
        fertilityMin:     'moderate',
        drainagePreference: 'well-drained to moderately drained',
        soilTexturePreference: 'sandy loam to loam',
        notes: 'Prefers slightly acidic to neutral pH. Does not tolerate waterlogging.',
      },
      suitabilityWeights: {
        ph:          0.30,
        moisture:    0.20,
        fertility:   0.25,
        soilCondition: 0.15,
        location:    0.10,
      },
      minSuitabilityThreshold: 50,
    },
    {
      cropId:       'taro',
      cropName:     'Taro / Gabi',
      localName:    'Gabi',
      category:     'Root Crop',
      family:       'Araceae',
      description:  'Requires moist, fertile soil. Good in lowland areas with water retention.',
      isActive:     true,
      isDemoData:   true,
      dataSource:   'DEMO — Verify with DA-MIMAROPA Extension Office',
      requirements: {
        phMin:            5.5,
        phMax:            7.0,
        phOptimal:        6.5,
        moistureMin:      60,
        moistureMax:      90,
        moistureOptimal:  75,
        fertilityMin:     'fertile',
        drainagePreference: 'moist to poorly drained',
        soilTexturePreference: 'clay loam to silty clay',
        notes: 'Requires high moisture and organic matter. Not suitable for sandy or dry soils.',
      },
      suitabilityWeights: {
        ph:          0.25,
        moisture:    0.30,
        fertility:   0.25,
        soilCondition: 0.10,
        location:    0.10,
      },
      minSuitabilityThreshold: 50,
    },
    {
      cropId:       'ube',
      cropName:     'Purple Yam',
      localName:    'Ube',
      category:     'Root Crop',
      family:       'Dioscoreaceae',
      description:  'High-value root crop. Requires fertile, well-drained soil.',
      isActive:     true,
      isDemoData:   true,
      dataSource:   'DEMO — Verify with DA-MIMAROPA Extension Office',
      requirements: {
        phMin:            5.5,
        phMax:            6.5,
        phOptimal:        6.0,
        moistureMin:      50,
        moistureMax:      75,
        moistureOptimal:  65,
        fertilityMin:     'fertile',
        drainagePreference: 'well-drained',
        soilTexturePreference: 'loamy',
        notes: 'High-value crop. Requires fertile, well-drained soil and consistent moisture.',
      },
      suitabilityWeights: {
        ph:          0.30,
        moisture:    0.20,
        fertility:   0.30,
        soilCondition: 0.10,
        location:    0.10,
      },
      minSuitabilityThreshold: 55,
    },
    {
      cropId:       'arrow_root',
      cropName:     'Arrowroot',
      localName:    'Uraro',
      category:     'Root Crop',
      family:       'Marantaceae',
      description:  'Shade-tolerant root crop. Used for specialty starch production.',
      isActive:     true,
      isDemoData:   true,
      dataSource:   'DEMO — Verify with DA-MIMAROPA Extension Office',
      requirements: {
        phMin:            6.0,
        phMax:            7.5,
        phOptimal:        6.5,
        moistureMin:      50,
        moistureMax:      80,
        moistureOptimal:  65,
        fertilityMin:     'moderate',
        drainagePreference: 'well-drained',
        soilTexturePreference: 'sandy loam to loam',
        notes: 'More tolerant of alkaline conditions than other root crops.',
      },
      suitabilityWeights: {
        ph:          0.30,
        moisture:    0.20,
        fertility:   0.25,
        soilCondition: 0.15,
        location:    0.10,
      },
      minSuitabilityThreshold: 45,
    },
  ];

  await seedCollection('crops', crops, 'cropId');
}

// ─── 3. FUZZY RULES ───────────────────────────────────────────

async function seedFuzzyRules() {
  // Each rule maps: IF [conditions] THEN fertilityClass
  // strength: how strongly this rule fires (0.0–1.0) — configurable weight
  const rules = [
    // ── High confidence fertile rules ────────────────────────
    { ruleId: 'r01', ph: 'optimal',         moisture: 'moderate', visualCondition: 'good',     fertilityClass: 'fertile',  strength: 1.0, description: 'Optimal pH + moderate moisture + good visual → Fertile' },
    { ruleId: 'r02', ph: 'optimal',         moisture: 'wet',      visualCondition: 'good',     fertilityClass: 'fertile',  strength: 0.9, description: 'Optimal pH + wet + good visual → Fertile' },
    { ruleId: 'r03', ph: 'slightly_alkaline', moisture: 'moderate', visualCondition: 'good',   fertilityClass: 'fertile',  strength: 0.8, description: 'Slightly alkaline pH + moderate moisture + good visual → Fertile' },
    { ruleId: 'r04', ph: 'optimal',         moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'fertile',  strength: 0.75, description: 'Optimal pH + moderate moisture + moderate visual → Fertile' },

    // ── Moderate rules ────────────────────────────────────────
    { ruleId: 'r05', ph: 'acidic',          moisture: 'moderate', visualCondition: 'good',     fertilityClass: 'moderate', strength: 0.85, description: 'Acidic pH + moderate moisture + good visual → Moderate' },
    { ruleId: 'r06', ph: 'acidic',          moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7, description: 'Acidic pH + moderate moisture + moderate visual → Moderate' },
    { ruleId: 'r07', ph: 'optimal',         moisture: 'dry',      visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7, description: 'Optimal pH + dry moisture + moderate visual → Moderate' },
    { ruleId: 'r08', ph: 'slightly_alkaline', moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7, description: 'Slightly alkaline + moderate moisture + moderate visual → Moderate' },
    { ruleId: 'r09', ph: 'acidic',          moisture: 'wet',      visualCondition: 'good',     fertilityClass: 'moderate', strength: 0.65, description: 'Acidic + wet + good visual → Moderate' },
    { ruleId: 'r10', ph: 'optimal',         moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'moderate', strength: 0.55, description: 'Optimal pH + dry + poor visual → Moderate (pH helps)' },

    // ── Poor rules ────────────────────────────────────────────
    { ruleId: 'r11', ph: 'strongly_acidic', moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 1.0, description: 'Strongly acidic + dry + poor visual → Poor' },
    { ruleId: 'r12', ph: 'strongly_acidic', moisture: 'moderate', visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.9, description: 'Strongly acidic + moderate moisture + poor visual → Poor' },
    { ruleId: 'r13', ph: 'alkaline',        moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.85, description: 'Alkaline + dry + poor visual → Poor' },
    { ruleId: 'r14', ph: 'strongly_acidic', moisture: 'dry',      visualCondition: 'moderate', fertilityClass: 'poor',     strength: 0.8, description: 'Strongly acidic + dry + moderate visual → Poor' },
    { ruleId: 'r15', ph: 'acidic',          moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.75, description: 'Acidic + dry + poor visual → Poor' },
  ];

  // Add metadata
  const rulesWithMeta = rules.map(r => ({
    ...r,
    isActive:    true,
    isDemoData:  true,
    dataSource:  'DEMO — Configurable by Admin',
    createdAt:   new Date(),
  }));

  await seedCollection('fuzzy_rules', rulesWithMeta, 'ruleId');
}

// ─── 4. AGRICULTURAL STANDARDS ────────────────────────────────

async function seedAgriculturalStandards() {
  const standards = [
    {
      standardId:  'ph_ranges',
      category:    'soil_ph',
      name:        'Soil pH Classification',
      isDemoData:  true,
      dataSource:  'DEMO — Based on general agronomy literature. Verify with local standards.',
      ranges: [
        { label: 'Strongly Acidic',  fuzzySet: 'strongly_acidic',  min: 0.0, max: 5.0,  color: '#dc2626' },
        { label: 'Acidic',           fuzzySet: 'acidic',           min: 5.0, max: 5.5,  color: '#ea580c' },
        { label: 'Slightly Acidic',  fuzzySet: 'slightly_acidic',  min: 5.5, max: 6.0,  color: '#d97706' },
        { label: 'Optimal',          fuzzySet: 'optimal',          min: 6.0, max: 7.0,  color: '#16a34a' },
        { label: 'Slightly Alkaline',fuzzySet: 'slightly_alkaline',min: 7.0, max: 7.5,  color: '#2563eb' },
        { label: 'Alkaline',         fuzzySet: 'alkaline',         min: 7.5, max: 14.0, color: '#7c3aed' },
      ],
    },
    {
      standardId:  'moisture_ranges',
      category:    'soil_moisture',
      name:        'Soil Moisture Classification',
      isDemoData:  true,
      dataSource:  'DEMO — General agronomy reference values.',
      ranges: [
        { label: 'Very Dry', fuzzySet: 'very_dry', min: 0,  max: 20,  color: '#dc2626' },
        { label: 'Dry',      fuzzySet: 'dry',      min: 20, max: 35,  color: '#ea580c' },
        { label: 'Moderate', fuzzySet: 'moderate', min: 35, max: 65,  color: '#16a34a' },
        { label: 'Moist',    fuzzySet: 'wet',      min: 65, max: 80,  color: '#2563eb' },
        { label: 'Very Moist',fuzzySet:'very_wet', min: 80, max: 100, color: '#7c3aed' },
      ],
    },
    {
      standardId:  'fertility_thresholds',
      category:    'fertility_score',
      name:        'Fertility Score Thresholds',
      isDemoData:  true,
      dataSource:  'DEMO — Configurable by Admin',
      ranges: [
        { label: 'Poor',     min: 0,  max: 39,  color: '#dc2626' },
        { label: 'Moderate', min: 40, max: 69,  color: '#d97706' },
        { label: 'Fertile',  min: 70, max: 100, color: '#16a34a' },
      ],
    },
  ];

  await seedCollection('agricultural_standards', standards, 'standardId');
}

// ─── 5. FERTILIZER RECOMMENDATIONS ───────────────────────────

async function seedFertilizerRecommendations() {
  const recommendations = [
    {
      recId:          'fert-poor-general',
      fertilityClass: 'poor',
      cropId:         'general',
      isDemoData:     true,
      dataSource:     'DEMO — Verify with DA/PhilRice before field application',
      generalRecommendation: 'Soil fertility is poor. Prioritize soil rehabilitation before planting.',
      actions: [
        'Apply organic matter (compost or farm yard manure) to improve soil structure.',
        'Conduct lime application if soil is strongly acidic (pH < 5.5).',
        'Avoid planting until pH and moisture conditions are improved.',
        'Consult an agricultural extension worker for a tailored soil rehabilitation plan.',
      ],
      avoidActions: [
        'Avoid applying high doses of chemical fertilizer to extremely acidic soil — nutrients may not be absorbed.',
      ],
      retestRecommendation: 'Retest soil after 3–6 months of soil management.',
      warnings: ['Laboratory soil analysis is strongly recommended for poor fertility soils.'],
    },
    {
      recId:          'fert-moderate-cassava',
      fertilityClass: 'moderate',
      cropId:         'cassava',
      isDemoData:     true,
      dataSource:     'DEMO — General reference values. Verify with local DA recommendations.',
      generalRecommendation: 'Soil is moderately fertile. Cassava can grow with supplemental nutrition.',
      npkGuidance: {
        note: 'These are indicative values only. Exact application rates require laboratory N-P-K analysis.',
        nitrogen:   'Moderate — 40–60 kg N/ha (indicative)',
        phosphorus: 'Low-Moderate — 20–40 kg P₂O₅/ha (indicative)',
        potassium:  'Moderate — 40–60 kg K₂O/ha (indicative)',
      },
      actions: [
        'Apply balanced fertilizer (e.g., 14-14-14 or similar) at planting.',
        'Supplement with organic matter to improve soil organic carbon.',
        'Monitor crop growth for signs of nutrient deficiency.',
      ],
      avoidActions: [
        'Avoid excessive nitrogen — can promote foliage over root development in cassava.',
      ],
      retestRecommendation: 'Retest soil after one cropping season.',
    },
    {
      recId:          'fert-moderate-sweet_potato',
      fertilityClass: 'moderate',
      cropId:         'sweet_potato',
      isDemoData:     true,
      dataSource:     'DEMO — General reference. Verify with PhilRootcrops recommendations.',
      generalRecommendation: 'Soil is moderately fertile. Sweet potato can thrive with proper management.',
      npkGuidance: {
        note: 'Indicative values only. Laboratory N-P-K analysis required for precise recommendations.',
        nitrogen:   'Low-Moderate — 30–50 kg N/ha (indicative)',
        phosphorus: 'Low — 20–30 kg P₂O₅/ha (indicative)',
        potassium:  'High — 60–80 kg K₂O/ha (indicative — sweet potato is a high potassium crop)',
      },
      actions: [
        'Prioritize potassium application for root development.',
        'Apply organic fertilizer 2–3 weeks before planting.',
        'Ensure proper drainage — sweet potato does not tolerate waterlogging.',
      ],
      avoidActions: [
        'Avoid excessive nitrogen — promotes vine growth at the expense of root yield.',
        'Avoid waterlogged conditions.',
      ],
      retestRecommendation: 'Retest soil after one cropping season.',
    },
    {
      recId:          'fert-fertile-general',
      fertilityClass: 'fertile',
      cropId:         'general',
      isDemoData:     true,
      dataSource:     'DEMO — General agronomy reference.',
      generalRecommendation: 'Soil is fertile. Maintain soil health with balanced nutrient management.',
      actions: [
        'Maintain organic matter with regular compost or green manure applications.',
        'Apply fertilizer based on crop-specific requirements.',
        'Rotate crops to prevent nutrient depletion.',
        'Monitor for potential over-fertilization signs.',
      ],
      avoidActions: [
        'Avoid excessive fertilization — can cause nutrient toxicity and environmental runoff.',
      ],
      retestRecommendation: 'Retest soil annually or after 2 cropping seasons.',
    },
  ];

  await seedCollection('fertilizer_recommendations', recommendations, 'recId');
}

// ─── 6. SAMPLE ASSESSMENTS ────────────────────────────────────

async function seedSampleAssessments() {
  const assessments = [
    {
      assessmentId: 'SS-2026-0001',
      userId:       'seed-demo-farmer',
      farmerName:   'Juan dela Cruz',
      status:       'completed',
      isDemoData:   true,
      createdAt:    new Date('2026-09-15T08:30:00Z'),
      location: {
        latitude:     12.5882,
        longitude:    121.5075,
        barangay:     'Canubing I',
        municipality: 'Roxas',
        province:     'Oriental Mindoro',
      },
      imageFeatures: {
        avgHue:        42.3,
        avgSaturation: 45.1,
        avgBrightness: 87.2,
        avgR: 135, avgG: 108, avgB: 71,
        textureContrast:    0.38,
        textureHomogeneity: 0.62,
        imageQuality:       'good',
        qualityScore:       0.85,
      },
      sensorData: {
        available:    true,
        deviceId:     'SS-ESP32-001',
        soilPH:       6.2,
        soilMoisture: 57,
      },
      fuzzyInputs: {
        ph:             6.2,
        phFuzzySet:     'optimal',
        moisture:       57,
        moistureFuzzySet: 'moderate',
        visualCondition: 'good',
      },
      fuzzyResult: {
        fertilityClass:  'moderate',
        fertilityScore:  68,
        confidence:      82,
        confidenceLevel: 'high',
        activatedRules:  ['r05', 'r04', 'r07'],
        explanation: 'Soil pH is within the optimal-to-acceptable range. Moisture levels are moderate. Image quality is good. The combination suggests moderate fertility with potential for improvement.',
      },
      rootcropResults: [
        { rank: 1, status: 'BEST',         cropId: 'sweet_potato', cropName: 'Sweet Potato', suitabilityScore: 91, explanation: 'pH and moisture are within preferred range for sweet potato.' },
        { rank: 2, status: 'SECOND_BEST',  cropId: 'cassava',      cropName: 'Cassava',      suitabilityScore: 78, explanation: 'pH is acceptable. Moisture is slightly above optimal for cassava.' },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'taro',         cropName: 'Taro / Gabi',  suitabilityScore: 34, explanation: 'Moisture level is below the minimum requirement for taro.' },
      ],
      fertilizerRecommendation: 'fert-moderate-sweet_potato',
      processingTimeMs: 4520,
      labValidation: null,
    },
    {
      assessmentId: 'SS-2026-0002',
      userId:       'seed-demo-farmer',
      farmerName:   'Juan dela Cruz',
      status:       'completed',
      isDemoData:   true,
      createdAt:    new Date('2026-09-28T10:15:00Z'),
      location: {
        latitude:     12.5901,
        longitude:    121.5112,
        barangay:     'Bayanan I',
        municipality: 'Roxas',
        province:     'Oriental Mindoro',
      },
      imageFeatures: {
        avgHue:        38.1,
        avgSaturation: 38.4,
        avgBrightness: 72.1,
        avgR: 118, avgG: 95, avgB: 62,
        textureContrast:    0.55,
        textureHomogeneity: 0.48,
        imageQuality:       'moderate',
        qualityScore:       0.65,
      },
      sensorData: {
        available:    false,
        deviceId:     null,
        soilPH:       null,
        soilMoisture: null,
      },
      fuzzyInputs: {
        ph:              null,
        phFuzzySet:      null,
        moisture:        null,
        moistureFuzzySet: null,
        visualCondition: 'moderate',
      },
      fuzzyResult: {
        fertilityClass:  'poor',
        fertilityScore:  31,
        confidence:      52,
        confidenceLevel: 'limited',
        activatedRules:  ['r12'],
        explanation: 'Assessment based on image features only (no sensor data). Visual soil condition is moderate. Without pH and moisture readings, confidence is limited. Soil rehabilitation may be needed.',
      },
      rootcropResults: [
        { rank: 1, status: 'BEST',         cropId: 'cassava',  cropName: 'Cassava',      suitabilityScore: 52, meetsThreshold: true,  explanation: 'Cassava is the most tolerant of poor soil conditions among evaluated crops.' },
        { rank: 2, status: 'SECOND_BEST',  cropId: 'arrow_root', cropName: 'Arrowroot',  suitabilityScore: 41, meetsThreshold: false, explanation: 'Arrowroot has lower soil quality requirements but conditions are still marginal.' },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'taro',     cropName: 'Taro / Gabi',  suitabilityScore: 22, meetsThreshold: false, explanation: 'Taro requires fertile moist soil — current conditions are unsuitable.' },
      ],
      fertilizerRecommendation: 'fert-poor-general',
      processingTimeMs: 3210,
      labValidation: null,
    },
    {
      assessmentId: 'SS-2026-0003',
      userId:       'seed-demo-admin',
      farmerName:   'Dr. Ana Reyes (Demo Site)',
      status:       'completed',
      isDemoData:   true,
      createdAt:    new Date('2026-10-02T14:45:00Z'),
      location: {
        latitude:     12.5855,
        longitude:    121.5021,
        barangay:     'Pili',
        municipality: 'Roxas',
        province:     'Oriental Mindoro',
      },
      imageFeatures: {
        avgHue:        52.4,
        avgSaturation: 58.2,
        avgBrightness: 108.5,
        avgR: 158, avgG: 138, avgB: 89,
        textureContrast:    0.25,
        textureHomogeneity: 0.78,
        imageQuality:       'good',
        qualityScore:       0.92,
      },
      sensorData: {
        available:    true,
        deviceId:     'SS-ESP32-001',
        soilPH:       6.6,
        soilMoisture: 68,
      },
      fuzzyInputs: {
        ph:              6.6,
        phFuzzySet:      'optimal',
        moisture:        68,
        moistureFuzzySet: 'wet',
        visualCondition: 'good',
      },
      fuzzyResult: {
        fertilityClass:  'fertile',
        fertilityScore:  79,
        confidence:      88,
        confidenceLevel: 'high',
        activatedRules:  ['r02', 'r01'],
        explanation: 'Soil pH is optimal. Moisture is in the moist-to-wet range. Image quality is good. Multiple fuzzy rules agree on fertile classification.',
      },
      rootcropResults: [
        { rank: 1, status: 'BEST',         cropId: 'taro',         cropName: 'Taro / Gabi',  suitabilityScore: 87, explanation: 'High moisture and fertile soil match taro requirements well.' },
        { rank: 2, status: 'SECOND_BEST',  cropId: 'sweet_potato', cropName: 'Sweet Potato', suitabilityScore: 74, explanation: 'Fertile and moist — sweet potato grows well but moisture is slightly high.' },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'cassava',      cropName: 'Cassava',       suitabilityScore: 44, explanation: 'Cassava prefers drier conditions. Current high moisture reduces suitability.' },
      ],
      fertilizerRecommendation: 'fert-fertile-general',
      processingTimeMs: 5100,
      labValidation: {
        isValidated:      true,
        labFertilityClass:'fertile',
        labPH:            6.7,
        labOrgMatter:     '3.2%',
        enteredAt:        new Date('2026-10-03T09:00:00Z'),
        enteredBy:        'seed-demo-admin',
        notes:            'DEMO LAB DATA — not from a real laboratory analysis.',
      },
    },
  ];

  await seedCollection('soil_assessments', assessments, 'assessmentId');
}

// ─── 7. SYSTEM SETTINGS ───────────────────────────────────────

async function seedSystemSettings() {
  const settings = [
    {
      settingId: 'counter_2026',
      count:     3,         // We already created 3 demo assessments
      year:      2026,
      updatedAt: new Date(),
    },
    {
      settingId: 'app_config',
      appName:   'SoilSense',
      version:   '1.0.0',
      targetMunicipality: 'Roxas',
      targetProvince:     'Oriental Mindoro',
      defaultDeviceId:    'SS-ESP32-001',
      sensorStaleSeconds: 60,
      updatedAt: new Date(),
    },
  ];

  await seedCollection('system_settings', settings, 'settingId');
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 SoilSense Database Seed Script');
  console.log('===================================');
  console.log('⚠️  All seeded data is labeled as DEMO.');
  console.log('    Agricultural standards must be verified by');
  console.log('    a qualified extension officer before production use.\n');

  try {
    await seedCrops();
    await seedFuzzyRules();
    await seedAgriculturalStandards();
    await seedFertilizerRecommendations();
    await seedSampleAssessments();
    await seedSystemSettings();

    console.log('\n✅ Seeding complete!');
    console.log('\nNo demo login accounts are created. Create users through Firebase Authentication.');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  process.exit(0);
}

main();

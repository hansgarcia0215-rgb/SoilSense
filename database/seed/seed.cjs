/**
 * seed.cjs — SoilSense Database Seed Script
 *
 * How to run (from /backend directory):
 *   node ../database/seed/seed.cjs
 *
 * Creates:
 *   - 3 demo users
 *   - 22 fruit/tree farm crops (Afipanio Lumbres farm)
 *   - 15 fuzzy rules
 *   - Agricultural standards
 *   - Fertilizer recommendations
 *   - 3 sample assessments
 *   - System settings
 */

require('dotenv').config({ path: `${__dirname}/../../backend/.env` });

const BACKEND_MODULES = `${__dirname}/../../backend/node_modules`;
const bcrypt = require(`${BACKEND_MODULES}/bcryptjs`);
const admin  = require(`${BACKEND_MODULES}/firebase-admin`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const SALT_ROUNDS = 12;

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

// ─── 1. USERS ─────────────────────────────────────────────────────────────────

async function seedUsers() {
  const hash = await bcrypt.hash('Demo1234!', SALT_ROUNDS);
  const users = [
    {
      uid: 'demo-farmer-001', displayName: 'Juan dela Cruz',
      email: 'farmer@soilsense.demo', passwordHash: hash, role: 'farmer',
      barangay: 'Canubing I', municipality: 'Roxas', province: 'Oriental Mindoro',
      isActive: true, isDemoAccount: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    },
    {
      uid: 'demo-ext-001', displayName: 'Maria Santos',
      email: 'extension@soilsense.demo', passwordHash: hash, role: 'extension_worker',
      barangay: 'Poblacion I', municipality: 'Roxas', province: 'Oriental Mindoro',
      isActive: true, isDemoAccount: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    },
    {
      uid: 'demo-researcher-001', displayName: 'Dr. Ana Reyes',
      email: 'researcher@soilsense.demo', passwordHash: hash, role: 'researcher',
      barangay: 'Poblacion II', municipality: 'Roxas', province: 'Oriental Mindoro',
      isActive: true, isDemoAccount: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    },
  ];
  await seedCollection('users', users, 'uid');
}

// ─── 2. CROPS — 22 Afipanio Lumbres Farm Crops ────────────────────────────────
// fertilityMin drives crop recommendation from the fuzzy fertility result:
//   "poor"     = tolerates degraded soil
//   "moderate" = needs at least moderate fertility
//   "fertile"  = requires high-fertility soil

async function seedCrops() {
  const crops = [

    // ── High-fertility fruit trees ──────────────────────────────────────────
    {
      cropId: 'mango_kinalabaw', cropName: 'Mango — Kinalabaw', localName: 'Mangga (Kinalabaw)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'High-value native mango variety. Known for sweet, fibrous flesh. Widely grown in Mindoro.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.0, moistureMin: 40, moistureMax: 75, moistureOptimal: 55, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Tolerates wide pH range. Needs dry season for flowering.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.25, moisture: 0.20, soilCondition: 0.15, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.90,
    },
    {
      cropId: 'mango_queen', cropName: 'Mango — Queen Mango', localName: 'Mangga (Queen)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Queen mango — large, sweet, low-fiber. High market value.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.0, moistureMin: 40, moistureMax: 75, moistureOptimal: 55, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Needs dry period for flower induction.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.25, moisture: 0.20, soilCondition: 0.15, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.90,
    },
    {
      cropId: 'durian', cropName: 'Durian', localName: 'Durian',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'High-value tropical fruit. Requires deep, well-drained, fertile soil.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 6.0, phMax: 7.0, phOptimal: 6.5, moistureMin: 60, moistureMax: 85, moistureOptimal: 72, fertilityMin: 'fertile', drainagePreference: 'well-drained deep soil', notes: 'Does NOT tolerate waterlogging or poor soils.' },
      suitabilityWeights: { fertility: 0.35, ph: 0.25, moisture: 0.20, soilCondition: 0.12, location: 0.08 },
      minSuitabilityThreshold: 55, locationScoreRoxas: 0.75,
    },
    {
      cropId: 'mangosteen', cropName: 'Mangosteen', localName: 'Mangosteen',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Queen of tropical fruits. Requires highly fertile, consistently moist, deep soil.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 65, moistureMax: 90, moistureOptimal: 78, fertilityMin: 'fertile', drainagePreference: 'well-drained to moderately moist', notes: 'Very sensitive to drought and waterlogging. Needs organic-rich fertile soil.' },
      suitabilityWeights: { fertility: 0.35, ph: 0.25, moisture: 0.22, soilCondition: 0.12, location: 0.06 },
      minSuitabilityThreshold: 55, locationScoreRoxas: 0.75,
    },
    {
      cropId: 'lanzones', cropName: 'Lanzones / Longkong', localName: 'Lanzones',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Popular Philippine fruit. Davao-origin Longkong variety. Needs fertile moist soil.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 6.5, phOptimal: 6.0, moistureMin: 60, moistureMax: 85, moistureOptimal: 72, fertilityMin: 'fertile', drainagePreference: 'moderately well-drained', notes: 'Longkong variety from Davao. Slightly acidic fertile soil.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.25, moisture: 0.22, soilCondition: 0.13, location: 0.10 },
      minSuitabilityThreshold: 50, locationScoreRoxas: 0.80,
    },
    {
      cropId: 'avocado', cropName: 'Avocado', localName: 'Abokado',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'High-value fruit tree. Requires deep fertile soil and excellent drainage.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 50, moistureMax: 75, moistureOptimal: 62, fertilityMin: 'moderate', drainagePreference: 'well-drained — very sensitive to waterlogging', notes: 'Sensitive to flooding.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.25, moisture: 0.22, soilCondition: 0.13, location: 0.10 },
      minSuitabilityThreshold: 48, locationScoreRoxas: 0.82,
    },
    {
      cropId: 'rambutan', cropName: 'Rambutan', localName: 'Rambutan',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Popular tropical fruit. Well-suited to Mindoro lowland conditions.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 6.8, phOptimal: 6.0, moistureMin: 55, moistureMax: 80, moistureOptimal: 68, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Needs consistent moisture but good drainage.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.25, moisture: 0.20, soilCondition: 0.15, location: 0.10 },
      minSuitabilityThreshold: 48, locationScoreRoxas: 0.85,
    },
    {
      cropId: 'langka', cropName: 'Langka', localName: 'Langka (Jackfruit)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Versatile tropical tree. Used ripe and unripe. Tolerates moderate soils.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.5, moistureMin: 40, moistureMax: 75, moistureOptimal: 58, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Relatively tolerant of poor soils compared to other fruit trees.' },
      suitabilityWeights: { fertility: 0.28, ph: 0.25, moisture: 0.20, soilCondition: 0.17, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.88,
    },
    {
      cropId: 'marang', cropName: 'Marang', localName: 'Marang',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Rare tropical fruit related to langka. Requires humid, fertile conditions.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.2, moistureMin: 60, moistureMax: 85, moistureOptimal: 72, fertilityMin: 'fertile', drainagePreference: 'well-drained, high humidity', notes: 'Limited to lowland tropical areas.' },
      suitabilityWeights: { fertility: 0.32, ph: 0.25, moisture: 0.22, soilCondition: 0.13, location: 0.08 },
      minSuitabilityThreshold: 50, locationScoreRoxas: 0.80,
    },

    // ── Citrus crops ────────────────────────────────────────────────────────
    {
      cropId: 'kalamansi', cropName: 'Kalamansi', localName: 'Kalamansi',
      category: 'Citrus', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Philippine calamansi lime. High commercial demand. Well-suited to moderate fertility.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 45, moistureMax: 75, moistureOptimal: 60, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Tolerates moderate soil conditions.' },
      suitabilityWeights: { fertility: 0.28, ph: 0.28, moisture: 0.20, soilCondition: 0.14, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.88,
    },
    {
      cropId: 'dalandan', cropName: 'Dalandan', localName: 'Dalandan (Philippine Orange)',
      category: 'Citrus', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Philippine native orange. Good for juice.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.2, moistureMin: 45, moistureMax: 75, moistureOptimal: 60, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Sensitive to flooding.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.28, moisture: 0.18, soilCondition: 0.14, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.85,
    },
    {
      cropId: 'suha', cropName: 'Suha', localName: 'Suha (Pomelo)',
      category: 'Citrus', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Pomelo — largest citrus fruit. Deep root system benefits from fertile soil.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 45, moistureMax: 75, moistureOptimal: 60, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Tolerates brief dry spells.' },
      suitabilityWeights: { fertility: 0.30, ph: 0.28, moisture: 0.18, soilCondition: 0.14, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.82,
    },
    {
      cropId: 'sinturis', cropName: 'Sinturis', localName: 'Sinturis',
      category: 'Citrus', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Local citrus variety grown in Oriental Mindoro.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with local DA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 40, moistureMax: 75, moistureOptimal: 57, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Similar requirements to kalamansi.' },
      suitabilityWeights: { fertility: 0.28, ph: 0.28, moisture: 0.20, soilCondition: 0.14, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.85,
    },

    // ── Medium-fertility trees ──────────────────────────────────────────────
    {
      cropId: 'guyabano', cropName: 'Guyabano', localName: 'Guyabano (Soursop)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Soursop. High medicinal and commercial value.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 45, moistureMax: 75, moistureOptimal: 60, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Moderately tolerant of soil conditions.' },
      suitabilityWeights: { fertility: 0.28, ph: 0.25, moisture: 0.22, soilCondition: 0.15, location: 0.10 },
      minSuitabilityThreshold: 45, locationScoreRoxas: 0.87,
    },
    {
      cropId: 'atis', cropName: 'Atis', localName: 'Atis (Sugar Apple)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Sugar apple. Drought-tolerant once established.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.5, moistureMin: 35, moistureMax: 70, moistureOptimal: 52, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Relatively drought-tolerant. Wide pH tolerance.' },
      suitabilityWeights: { fertility: 0.26, ph: 0.26, moisture: 0.22, soilCondition: 0.16, location: 0.10 },
      minSuitabilityThreshold: 43, locationScoreRoxas: 0.87,
    },
    {
      cropId: 'chiko', cropName: 'Chiko', localName: 'Tsiko (Sapodilla)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Sapodilla. Tolerates a range of soil conditions.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 6.0, phMax: 8.0, phOptimal: 6.8, moistureMin: 40, moistureMax: 75, moistureOptimal: 58, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Wide pH tolerance including alkaline soils.' },
      suitabilityWeights: { fertility: 0.26, ph: 0.26, moisture: 0.22, soilCondition: 0.16, location: 0.10 },
      minSuitabilityThreshold: 43, locationScoreRoxas: 0.87,
    },
    {
      cropId: 'papaya', cropName: 'Papaya', localName: 'Papaya',
      category: 'Fast-Maturing Fruit', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Fast-maturing fruit crop. Good early-income option under moderate to fertile soil.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.0, phOptimal: 6.0, moistureMin: 40, moistureMax: 75, moistureOptimal: 57, fertilityMin: 'moderate', drainagePreference: 'well-drained — extremely sensitive to waterlogging', notes: 'Fast-growing. Moderate fertility needs.' },
      suitabilityWeights: { fertility: 0.25, ph: 0.25, moisture: 0.25, soilCondition: 0.15, location: 0.10 },
      minSuitabilityThreshold: 42, locationScoreRoxas: 0.90,
    },

    // ── Hardy / low-fertility tolerant trees ──────────────────────────────
    {
      cropId: 'duhat', cropName: 'Duhat', localName: 'Duhat (Java Plum)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Hardy tree. Tolerates poor soils and seasonal flooding.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 8.0, phOptimal: 6.5, moistureMin: 40, moistureMax: 85, moistureOptimal: 65, fertilityMin: 'poor', drainagePreference: 'tolerates seasonal waterlogging', notes: 'Most adaptable fruit tree. Grows in poor fluctuating soils.' },
      suitabilityWeights: { fertility: 0.22, ph: 0.25, moisture: 0.25, soilCondition: 0.18, location: 0.10 },
      minSuitabilityThreshold: 38, locationScoreRoxas: 0.90,
    },
    {
      cropId: 'sampalok', cropName: 'Sampalok', localName: 'Sampalok (Tamarind)',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Tamarind. Highly drought-tolerant. Grows in poor, dry soils.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 8.5, phOptimal: 6.5, moistureMin: 25, moistureMax: 65, moistureOptimal: 45, fertilityMin: 'poor', drainagePreference: 'well-drained, tolerates dry conditions', notes: 'Extremely drought-tolerant. Best tree for poor/degraded soils.' },
      suitabilityWeights: { fertility: 0.20, ph: 0.25, moisture: 0.28, soilCondition: 0.17, location: 0.10 },
      minSuitabilityThreshold: 35, locationScoreRoxas: 0.88,
    },
    {
      cropId: 'santol', cropName: 'Santol', localName: 'Santol',
      category: 'Fruit Tree', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Cotton fruit. Moderate soil requirements. Tolerates a range of conditions.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA Extension Office',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.5, moistureMin: 40, moistureMax: 75, moistureOptimal: 57, fertilityMin: 'moderate', drainagePreference: 'well-drained', notes: 'Relatively adaptable. Good for diverse farm systems.' },
      suitabilityWeights: { fertility: 0.26, ph: 0.25, moisture: 0.22, soilCondition: 0.17, location: 0.10 },
      minSuitabilityThreshold: 43, locationScoreRoxas: 0.87,
    },

    // ── Palm ───────────────────────────────────────────────────────────────
    {
      cropId: 'dwarf_coconut', cropName: 'Dwarf Coconut', localName: 'Niyog (Dwarf)',
      category: 'Palm', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Dwarf coconut. Versatile food, oil, and landscape uses.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — Verify with DA-MIMAROPA / PCA Extension Office',
      requirements: { phMin: 5.0, phMax: 8.0, phOptimal: 6.5, moistureMin: 40, moistureMax: 80, moistureOptimal: 65, fertilityMin: 'moderate', drainagePreference: 'well-drained to moderately drained', notes: 'Wide soil tolerance. Requires potassium-rich soil for good production.' },
      suitabilityWeights: { fertility: 0.26, ph: 0.22, moisture: 0.22, soilCondition: 0.18, location: 0.12 },
      minSuitabilityThreshold: 42, locationScoreRoxas: 0.92,
    },

    // ── Ornamental ─────────────────────────────────────────────────────────
    {
      cropId: 'bugambilya', cropName: 'Bugambilya / Bougainvillea', localName: 'Bugambilya',
      category: 'Ornamental', currentFarmCrop: true, farmOwner: 'AFIPANIO LUMBRES',
      description: 'Flowering ornamental. Thrives in poor, well-drained soils. Drought-tolerant.',
      isActive: true, isDemoData: true, dataSource: 'REFERENCE — General horticultural literature',
      requirements: { phMin: 5.5, phMax: 7.5, phOptimal: 6.5, moistureMin: 25, moistureMax: 60, moistureOptimal: 42, fertilityMin: 'poor', drainagePreference: 'well-drained — prefers dry conditions', notes: 'Prefers POOR soil. Overly fertile soil promotes foliage over flowers.' },
      suitabilityWeights: { fertility: 0.15, ph: 0.25, moisture: 0.30, soilCondition: 0.20, location: 0.10 },
      minSuitabilityThreshold: 35, locationScoreRoxas: 0.90,
    },
  ];

  await seedCollection('crops', crops, 'cropId');
}

// ─── 3. FUZZY RULES ───────────────────────────────────────────────────────────

async function seedFuzzyRules() {
  const rules = [
    { ruleId: 'r01', ph: 'optimal',          moisture: 'moderate', visualCondition: 'good',     fertilityClass: 'fertile',  strength: 1.0,  description: 'Optimal pH + moderate moisture + good visual → Fertile' },
    { ruleId: 'r02', ph: 'optimal',          moisture: 'wet',      visualCondition: 'good',     fertilityClass: 'fertile',  strength: 0.9,  description: 'Optimal pH + wet + good visual → Fertile' },
    { ruleId: 'r03', ph: 'slightly_alkaline',moisture: 'moderate', visualCondition: 'good',     fertilityClass: 'fertile',  strength: 0.8,  description: 'Slightly alkaline + moderate moisture + good visual → Fertile' },
    { ruleId: 'r04', ph: 'optimal',          moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'fertile',  strength: 0.75, description: 'Optimal pH + moderate moisture + moderate visual → Fertile' },
    { ruleId: 'r05', ph: 'acidic',           moisture: 'moderate', visualCondition: 'good',     fertilityClass: 'moderate', strength: 0.85, description: 'Acidic + moderate moisture + good visual → Moderate' },
    { ruleId: 'r06', ph: 'acidic',           moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7,  description: 'Acidic + moderate moisture + moderate visual → Moderate' },
    { ruleId: 'r07', ph: 'optimal',          moisture: 'dry',      visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7,  description: 'Optimal pH + dry + moderate visual → Moderate' },
    { ruleId: 'r08', ph: 'slightly_alkaline',moisture: 'moderate', visualCondition: 'moderate', fertilityClass: 'moderate', strength: 0.7,  description: 'Slightly alkaline + moderate + moderate visual → Moderate' },
    { ruleId: 'r09', ph: 'acidic',           moisture: 'wet',      visualCondition: 'good',     fertilityClass: 'moderate', strength: 0.65, description: 'Acidic + wet + good visual → Moderate' },
    { ruleId: 'r10', ph: 'optimal',          moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'moderate', strength: 0.55, description: 'Optimal pH + dry + poor visual → Moderate' },
    { ruleId: 'r11', ph: 'strongly_acidic',  moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 1.0,  description: 'Strongly acidic + dry + poor visual → Poor' },
    { ruleId: 'r12', ph: 'strongly_acidic',  moisture: 'moderate', visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.9,  description: 'Strongly acidic + moderate + poor visual → Poor' },
    { ruleId: 'r13', ph: 'alkaline',         moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.85, description: 'Alkaline + dry + poor visual → Poor' },
    { ruleId: 'r14', ph: 'strongly_acidic',  moisture: 'dry',      visualCondition: 'moderate', fertilityClass: 'poor',     strength: 0.8,  description: 'Strongly acidic + dry + moderate visual → Poor' },
    { ruleId: 'r15', ph: 'acidic',           moisture: 'dry',      visualCondition: 'poor',     fertilityClass: 'poor',     strength: 0.75, description: 'Acidic + dry + poor visual → Poor' },
  ];
  const rulesWithMeta = rules.map(r => ({ ...r, isActive: true, isDemoData: true, dataSource: 'DEMO — Configurable by Researcher/Admin', createdAt: new Date() }));
  await seedCollection('fuzzy_rules', rulesWithMeta, 'ruleId');
}

// ─── 4. AGRICULTURAL STANDARDS ────────────────────────────────────────────────

async function seedAgriculturalStandards() {
  const standards = [
    {
      standardId: 'ph_ranges', category: 'soil_ph', name: 'Soil pH Classification',
      isDemoData: true, dataSource: 'DEMO — Based on general agronomy literature.',
      ranges: [
        { label: 'Strongly Acidic',   fuzzySet: 'strongly_acidic',   min: 0.0, max: 5.0,  color: '#dc2626' },
        { label: 'Acidic',            fuzzySet: 'acidic',            min: 5.0, max: 5.5,  color: '#ea580c' },
        { label: 'Slightly Acidic',   fuzzySet: 'slightly_acidic',   min: 5.5, max: 6.0,  color: '#d97706' },
        { label: 'Optimal',           fuzzySet: 'optimal',           min: 6.0, max: 7.0,  color: '#16a34a' },
        { label: 'Slightly Alkaline', fuzzySet: 'slightly_alkaline', min: 7.0, max: 7.5,  color: '#2563eb' },
        { label: 'Alkaline',          fuzzySet: 'alkaline',          min: 7.5, max: 14.0, color: '#7c3aed' },
      ],
    },
    {
      standardId: 'moisture_ranges', category: 'soil_moisture', name: 'Soil Moisture Classification',
      isDemoData: true, dataSource: 'DEMO — General agronomy reference values.',
      ranges: [
        { label: 'Very Dry',  fuzzySet: 'very_dry', min: 0,  max: 20,  color: '#dc2626' },
        { label: 'Dry',       fuzzySet: 'dry',      min: 20, max: 35,  color: '#ea580c' },
        { label: 'Moderate',  fuzzySet: 'moderate', min: 35, max: 65,  color: '#16a34a' },
        { label: 'Moist',     fuzzySet: 'wet',      min: 65, max: 80,  color: '#2563eb' },
        { label: 'Very Moist',fuzzySet: 'very_wet', min: 80, max: 100, color: '#7c3aed' },
      ],
    },
    {
      standardId: 'fertility_thresholds', category: 'fertility_score', name: 'Fertility Score Thresholds',
      isDemoData: true, dataSource: 'DEMO — Configurable by Researcher/Admin',
      ranges: [
        { label: 'Poor',     min: 0,  max: 39,  color: '#dc2626' },
        { label: 'Moderate', min: 40, max: 69,  color: '#d97706' },
        { label: 'Fertile',  min: 70, max: 100, color: '#16a34a' },
      ],
    },
  ];
  await seedCollection('agricultural_standards', standards, 'standardId');
}

// ─── 5. FERTILIZER RECOMMENDATIONS ───────────────────────────────────────────

async function seedFertilizerRecommendations() {
  const recommendations = [
    {
      recId: 'fert-poor-general', fertilityClass: 'poor', cropId: 'general',
      isDemoData: true, dataSource: 'DEMO — Verify with DA before field application',
      generalRecommendation: 'Soil fertility is poor. Prioritize soil rehabilitation before planting fruit trees.',
      actions: [
        'Apply organic matter (compost or farm yard manure) to improve soil structure.',
        'Conduct lime application if strongly acidic (pH < 5.5).',
        'Hardy crops like Sampalok, Duhat, or Bugambilya are most tolerant of current conditions.',
        'Consult an agricultural extension worker for a soil rehabilitation plan.',
      ],
      avoidActions: ['Avoid planting high-value trees like Durian or Mangosteen until soil improves.'],
      retestRecommendation: 'Retest soil after 3–6 months of soil management.',
    },
    {
      recId: 'fert-moderate-general', fertilityClass: 'moderate', cropId: 'general',
      isDemoData: true, dataSource: 'DEMO — General reference. Verify with DA recommendations.',
      generalRecommendation: 'Soil is moderately fertile. Many fruit trees on the farm can perform well with proper nutrition management.',
      actions: [
        'Apply balanced fertilizer (14-14-14 or similar) at recommended rates.',
        'Supplement with organic matter — compost improves water retention and nutrient availability.',
        'Mango, Kalamansi, Papaya, and Langka are well-suited to current fertility.',
        'Monitor for nutrient deficiency signs during early growth.',
      ],
      avoidActions: ['Avoid planting highly demanding trees (Durian, Mangosteen) without soil improvement.'],
      retestRecommendation: 'Retest soil after one growing season.',
    },
    {
      recId: 'fert-fertile-general', fertilityClass: 'fertile', cropId: 'general',
      isDemoData: true, dataSource: 'DEMO — General agronomy reference.',
      generalRecommendation: 'Soil is fertile. High-value fruit trees including Durian, Mangosteen, and Lanzones can be prioritized.',
      actions: [
        'Maintain organic matter with regular compost or green manure applications.',
        'Apply fertilizer based on each crop\'s specific requirements.',
        'Fertile soil supports all farm crops — prioritize by market value.',
        'Monitor for potential over-fertilization signs.',
      ],
      avoidActions: ['Avoid excessive fertilization — can cause nutrient toxicity and runoff.'],
      retestRecommendation: 'Retest soil annually or after 2 cropping seasons.',
    },
    // Crop-specific keys
    {
      recId: 'fert-moderate-mango_kinalabaw', fertilityClass: 'moderate', cropId: 'mango_kinalabaw',
      isDemoData: true, dataSource: 'DEMO — General mango agronomy. Verify with DA.',
      generalRecommendation: 'Mango Kinalabaw can grow under moderate fertility. Apply balanced fertilizer.',
      actions: ['Apply NPK 14-14-14 at 200–500g per tree (indicative). Increase potassium near fruiting.'],
      retestRecommendation: 'Retest after one season.',
    },
    {
      recId: 'fert-fertile-durian', fertilityClass: 'fertile', cropId: 'durian',
      isDemoData: true, dataSource: 'DEMO — Durian agronomy. Verify with DA.',
      generalRecommendation: 'Fertile soil supports durian. Maintain high organic matter and proper drainage.',
      actions: ['Ensure deep drainage. Apply compost 2x per year. Monitor micronutrients.'],
      retestRecommendation: 'Retest annually.',
    },
    {
      recId: 'fert-poor-sampalok', fertilityClass: 'poor', cropId: 'sampalok',
      isDemoData: true, dataSource: 'DEMO — Tamarind agronomy.',
      generalRecommendation: 'Tamarind is one of the best choices for poor soil. Minimal inputs needed.',
      actions: ['Light organic mulch around base. Minimal irrigation needed once established.'],
      retestRecommendation: 'Retest after soil improvement program.',
    },
  ];
  await seedCollection('fertilizer_recommendations', recommendations, 'recId');
}

// ─── 6. FARM PROFILES ─────────────────────────────────────────────────────────

async function seedFarmProfiles() {
  const profiles = [
    {
      farmId:    'farm-lumbres-001',
      farmName:  'AFIPANIO LUMBRES',
      ownerId:   'demo-farmer-001',
      barangay:  'Roxas',
      municipality: 'Roxas',
      province:  'Oriental Mindoro',
      isDemoData: true,
      cropIds: [
        'lanzones','sinturis','dalandan','kalamansi','mango_kinalabaw','mango_queen',
        'durian','mangosteen','avocado','suha','atis','guyabano','rambutan','langka',
        'duhat','chiko','marang','papaya','sampalok','santol','dwarf_coconut','bugambilya',
      ],
      notes: 'Lanzones/Longkong sourced from Davao.',
      createdAt: new Date('2026-01-01'),
    },
  ];
  await seedCollection('farm_profiles', profiles, 'farmId');
}

// ─── 7. SAMPLE ASSESSMENTS ────────────────────────────────────────────────────

async function seedSampleAssessments() {
  const assessments = [
    {
      assessmentId: 'SS-2026-0001',
      userId: 'demo-farmer-001', farmerName: 'Juan dela Cruz',
      status: 'completed', isDemoData: true,
      createdAt: new Date('2026-09-15T08:30:00Z'),
      location: { latitude: 12.5882, longitude: 121.5075, barangay: 'Canubing I', municipality: 'Roxas', province: 'Oriental Mindoro' },
      imageFeatures: { avgHue: 42.3, avgSaturation: 45.1, avgBrightness: 87.2, avgR: 135, avgG: 108, avgB: 71, textureContrast: 0.38, textureHomogeneity: 0.62, imageQuality: 'good', qualityScore: 0.85 },
      sensorData: { available: true, deviceId: 'SS-ESP32-001', soilPH: 6.2, soilMoisture: 57 },
      fuzzyResult: { fertilityClass: 'moderate', fertilityScore: 68, confidence: 82, confidenceLevel: 'high', activatedRules: ['r05','r04','r07'], explanation: 'Soil pH is within the optimal-to-acceptable range. Moisture is moderate. The combination suggests moderate fertility with potential for improvement.' },
      rootcropResults: [
        { rank: 1, status: 'BEST', cropId: 'mango_kinalabaw', cropName: 'Mango — Kinalabaw', suitabilityScore: 88, currentFarmCrop: true, matchingFactors: ['pH compatible', 'Moderate fertility met'], limitingFactors: [] },
        { rank: 2, status: 'SECOND_BEST', cropId: 'kalamansi', cropName: 'Kalamansi', suitabilityScore: 84, currentFarmCrop: true, matchingFactors: ['pH compatible', 'Moisture suitable'], limitingFactors: [] },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'durian', cropName: 'Durian', suitabilityScore: 38, currentFarmCrop: true, matchingFactors: [], limitingFactors: ['Requires fertile soil — current is moderate'] },
      ],
      fertilizerRecommendation: 'fert-moderate-general',
      processingTimeMs: 4520, labValidation: null,
    },
    {
      assessmentId: 'SS-2026-0002',
      userId: 'demo-farmer-001', farmerName: 'Juan dela Cruz',
      status: 'completed', isDemoData: true,
      createdAt: new Date('2026-09-28T10:15:00Z'),
      location: { latitude: 12.5901, longitude: 121.5112, barangay: 'Bayanan I', municipality: 'Roxas', province: 'Oriental Mindoro' },
      imageFeatures: { avgHue: 38.1, avgSaturation: 38.4, avgBrightness: 72.1, avgR: 118, avgG: 95, avgB: 62, textureContrast: 0.55, textureHomogeneity: 0.48, imageQuality: 'moderate', qualityScore: 0.65 },
      sensorData: { available: false, deviceId: null, soilPH: null, soilMoisture: null },
      fuzzyResult: { fertilityClass: 'poor', fertilityScore: 31, confidence: 52, confidenceLevel: 'limited', activatedRules: ['r12'], explanation: 'Image-only assessment. Visual condition is moderate. Without pH and moisture data, confidence is limited. Soil rehabilitation may be needed.' },
      rootcropResults: [
        { rank: 1, status: 'BEST', cropId: 'sampalok', cropName: 'Sampalok', suitabilityScore: 62, currentFarmCrop: true, matchingFactors: ['Tolerates poor soil', 'Drought-tolerant'], limitingFactors: [] },
        { rank: 2, status: 'SECOND_BEST', cropId: 'duhat', cropName: 'Duhat', suitabilityScore: 58, currentFarmCrop: true, matchingFactors: ['Tolerates poor conditions'], limitingFactors: [] },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'mangosteen', cropName: 'Mangosteen', suitabilityScore: 12, currentFarmCrop: true, matchingFactors: [], limitingFactors: ['Requires fertile soil — current is poor', 'Requires consistently high moisture'] },
      ],
      fertilizerRecommendation: 'fert-poor-general',
      processingTimeMs: 3210, labValidation: null,
    },
    {
      assessmentId: 'SS-2026-0003',
      userId: 'demo-researcher-001', farmerName: 'Dr. Ana Reyes (Demo Site)',
      status: 'completed', isDemoData: true,
      createdAt: new Date('2026-10-02T14:45:00Z'),
      location: { latitude: 12.5855, longitude: 121.5021, barangay: 'Pili', municipality: 'Roxas', province: 'Oriental Mindoro' },
      imageFeatures: { avgHue: 52.4, avgSaturation: 58.2, avgBrightness: 108.5, avgR: 158, avgG: 138, avgB: 89, textureContrast: 0.25, textureHomogeneity: 0.78, imageQuality: 'good', qualityScore: 0.92 },
      sensorData: { available: true, deviceId: 'SS-ESP32-001', soilPH: 6.6, soilMoisture: 68 },
      fuzzyResult: { fertilityClass: 'fertile', fertilityScore: 79, confidence: 88, confidenceLevel: 'high', activatedRules: ['r02','r01'], explanation: 'Soil pH is optimal. Moisture is in the moist-to-wet range. Image quality is good. Multiple fuzzy rules agree on fertile classification.' },
      rootcropResults: [
        { rank: 1, status: 'BEST', cropId: 'lanzones', cropName: 'Lanzones / Longkong', suitabilityScore: 91, currentFarmCrop: true, matchingFactors: ['Fertile soil matches requirement', 'pH compatible', 'Moisture within range'], limitingFactors: [] },
        { rank: 2, status: 'SECOND_BEST', cropId: 'mangosteen', cropName: 'Mangosteen', suitabilityScore: 86, currentFarmCrop: true, matchingFactors: ['Fertile soil matches requirement', 'High moisture compatible'], limitingFactors: [] },
        { rank: 3, status: 'NOT_SUITABLE', cropId: 'bugambilya', cropName: 'Bugambilya / Bougainvillea', suitabilityScore: 28, currentFarmCrop: true, matchingFactors: [], limitingFactors: ['Prefers poor dry soil — current soil is fertile and moist', 'Overly fertile soil reduces flowering'] },
      ],
      fertilizerRecommendation: 'fert-fertile-general',
      processingTimeMs: 5100,
      labValidation: { isValidated: true, labFertilityClass: 'fertile', labPH: 6.7, labOrgMatter: '3.2%', enteredAt: new Date('2026-10-03T09:00:00Z'), enteredBy: 'demo-researcher-001', notes: 'DEMO LAB DATA — not from a real laboratory analysis.' },
    },
  ];
  await seedCollection('soil_assessments', assessments, 'assessmentId');
}

// ─── 8. SYSTEM SETTINGS ───────────────────────────────────────────────────────

async function seedSystemSettings() {
  const settings = [
    { settingId: 'counter_2026', count: 3, year: 2026, updatedAt: new Date() },
    { settingId: 'app_config', appName: 'SoilSense', version: '2.0.0', targetMunicipality: 'Roxas', targetProvince: 'Oriental Mindoro', defaultDeviceId: 'SS-ESP32-001', sensorStaleSeconds: 60, updatedAt: new Date() },
  ];
  await seedCollection('system_settings', settings, 'settingId');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 SoilSense Database Seed Script v2.0');
  console.log('=========================================');
  console.log('Farm: AFIPANIO LUMBRES — 22 fruit/tree crops');
  console.log('Crop recommendation driven by soil fertility result\n');
  try {
    await seedUsers();
    await seedCrops();
    await seedFuzzyRules();
    await seedAgriculturalStandards();
    await seedFertilizerRecommendations();
    await seedFarmProfiles();
    await seedSampleAssessments();
    await seedSystemSettings();
    console.log('\n✅ Seeding complete!');
    console.log('\nDemo Login Credentials:');
    console.log('  Farmer:     farmer@soilsense.demo      / Demo1234!');
    console.log('  Extension:  extension@soilsense.demo   / Demo1234!');
    console.log('  Researcher: researcher@soilsense.demo  / Demo1234!\n');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
  process.exit(0);
}

main();

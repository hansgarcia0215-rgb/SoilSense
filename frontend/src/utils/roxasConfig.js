/**
 * roxasConfig.js — Single source of truth for the Roxas, Oriental Mindoro service area
 *
 * SoilSense is scoped EXCLUSIVELY to the municipality of Roxas, Oriental Mindoro.
 * All location logic (GPS bounds, barangay list, map center) references this file.
 *
 * To expand the service area later, update ROXAS_BOUNDS and BARANGAYS here —
 * nothing else needs to change.
 */

// ─── Fixed location identity ──────────────────────────────────────────────────
export const MUNICIPALITY = 'Roxas';
export const PROVINCE      = 'Oriental Mindoro';
export const REGION        = 'MIMAROPA';

// ─── Map center (town proper of Roxas, Oriental Mindoro) ──────────────────────
export const ROXAS_CENTER = [12.5882, 121.5075]; // [lat, lng]
export const DEFAULT_ZOOM = 12;

// ─── Geographic bounding box for the municipality of Roxas ────────────────────
// Approximate municipal extent. GPS readings outside this box are flagged as
// "outside the Roxas service area". Values are generous to cover all barangays
// including coastal and upland areas.
export const ROXAS_BOUNDS = {
  minLat: 12.47,
  maxLat: 12.70,
  minLng: 121.40,
  maxLng: 121.62,
};

// Leaflet-format bounds [[southWest], [northEast]]
export const ROXAS_LEAFLET_BOUNDS = [
  [ROXAS_BOUNDS.minLat, ROXAS_BOUNDS.minLng],
  [ROXAS_BOUNDS.maxLat, ROXAS_BOUNDS.maxLng],
];

// ─── Official barangays of Roxas, Oriental Mindoro ────────────────────────────
// Source: DILG / PSA barangay listing for Roxas, Oriental Mindoro.
export const BARANGAYS = [
  'Bagumbayan',
  'Cantil',
  'Dangay',
  'Happy Valley',
  'Libertad',
  'Little Tanauan',
  'Mabuhay',
  'Maraska',
  'Odiong',
  'Paclasan',           // Poblacion / town center
  'San Aquilino',
  'San Isidro',
  'San Jose',
  'San Mariano',
  'San Rafael',
  'San Vicente',
  'Uyao',
  'Victoria',
].sort();

/**
 * Check whether a GPS coordinate falls within the Roxas service area.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isWithinRoxas(lat, lng) {
  if (lat == null || lng == null) return false;
  return (
    lat >= ROXAS_BOUNDS.minLat && lat <= ROXAS_BOUNDS.maxLat &&
    lng >= ROXAS_BOUNDS.minLng && lng <= ROXAS_BOUNDS.maxLng
  );
}

/**
 * Full fixed location object merged with a selected barangay + GPS.
 * Municipality and province are ALWAYS forced to Roxas / Oriental Mindoro.
 */
export function buildLocation({ barangay, latitude, longitude } = {}) {
  return {
    barangay:     barangay || null,
    municipality: MUNICIPALITY,
    province:     PROVINCE,
    region:       REGION,
    latitude:     latitude  ?? null,
    longitude:    longitude ?? null,
    withinServiceArea: isWithinRoxas(latitude, longitude),
  };
}

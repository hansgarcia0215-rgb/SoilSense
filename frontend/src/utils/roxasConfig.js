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

// Simplified Roxas municipal boundary from geoBoundaries PHL ADM3 (CC BY 3.0 IGO).
export const ROXAS_BOUNDARY = [
  [12.629996, 121.356222],
  [12.626281, 121.355294],
  [12.615757, 121.357976],
  [12.609773, 121.365612],
  [12.604717, 121.367675],
  [12.592955, 121.380057],
  [12.593780, 121.387692],
  [12.591726, 121.390460],
  [12.592309, 121.398614],
  [12.590561, 121.405216],
  [12.594446, 121.408328],
  [12.606288, 121.410070],
  [12.613084, 121.413759],
  [12.617355, 121.418030],
  [12.622792, 121.419001],
  [12.626009, 121.415712],
  [12.625516, 121.429358],
  [12.628071, 121.432448],
  [12.628110, 121.439235],
  [12.624799, 121.443787],
  [12.626103, 121.447120],
  [12.623449, 121.448845],
  [12.622397, 121.451689],
  [12.618064, 121.450769],
  [12.615546, 121.454463],
  [12.611227, 121.456204],
  [12.607878, 121.460697],
  [12.606647, 121.466333],
  [12.599951, 121.468474],
  [12.594145, 121.473766],
  [12.590536, 121.472775],
  [12.588191, 121.476008],
  [12.586399, 121.473776],
  [12.584213, 121.474769],
  [12.583032, 121.478660],
  [12.580823, 121.480678],
  [12.581717, 121.488111],
  [12.577026, 121.493048],
  [12.576187, 121.497232],
  [12.566424, 121.505966],
  [12.565703, 121.511851],
  [12.580752, 121.518166],
  [12.593200, 121.529642],
  [12.593092, 121.531981],
  [12.593677, 121.530278],
  [12.596556, 121.532457],
  [12.600463, 121.541056],
  [12.604407, 121.556952],
  [12.622659, 121.554823],
  [12.620058, 121.549570],
  [12.621298, 121.546219],
  [12.620350, 121.533979],
  [12.623102, 121.526428],
  [12.629439, 121.524759],
  [12.627445, 121.517045],
  [12.628517, 121.514188],
  [12.626036, 121.506593],
  [12.639937, 121.485046],
  [12.644305, 121.471416],
  [12.647970, 121.468139],
  [12.646415, 121.462547],
  [12.647750, 121.452168],
  [12.655847, 121.437792],
  [12.654043, 121.430026],
  [12.670093, 121.426051],
  [12.665191, 121.420298],
  [12.664407, 121.415386],
  [12.662471, 121.413004],
  [12.661612, 121.392002],
  [12.660246, 121.388449],
  [12.654135, 121.387292],
  [12.652060, 121.381588],
  [12.648282, 121.378094],
  [12.643952, 121.377058],
  [12.641034, 121.378094],
  [12.638869, 121.376588],
  [12.636893, 121.373293],
  [12.637081, 121.366421],
  [12.635763, 121.364351],
  [12.632751, 121.363786],
  [12.629996, 121.356222],
];

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
  [12.565703, 121.355294],
  [12.670093, 121.556952],
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

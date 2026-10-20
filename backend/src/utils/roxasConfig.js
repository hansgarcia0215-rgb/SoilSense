/**
 * roxasConfig.js — Server-side source of truth for the Roxas service area
 *
 * SoilSense is scoped EXCLUSIVELY to Roxas, Oriental Mindoro.
 * The orchestrator uses this to force municipality/province and to flag
 * assessments whose GPS falls outside the municipal boundary.
 */

const MUNICIPALITY = 'Roxas';
const PROVINCE     = 'Oriental Mindoro';
const REGION       = 'MIMAROPA';

// Municipal bounding box for Roxas, Oriental Mindoro
const ROXAS_BOUNDS = {
  minLat: 12.47,
  maxLat: 12.70,
  minLng: 121.40,
  maxLng: 121.62,
};

/**
 * Returns true if the coordinate is inside the Roxas service area.
 */
function isWithinRoxas(lat, lng) {
  if (lat == null || lng == null) return false;
  const la = parseFloat(lat), ln = parseFloat(lng);
  if (isNaN(la) || isNaN(ln)) return false;
  return (
    la >= ROXAS_BOUNDS.minLat && la <= ROXAS_BOUNDS.maxLat &&
    ln >= ROXAS_BOUNDS.minLng && ln <= ROXAS_BOUNDS.maxLng
  );
}

module.exports = {
  MUNICIPALITY, PROVINCE, REGION, ROXAS_BOUNDS, isWithinRoxas,
};

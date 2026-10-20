/**
 * MapView.jsx — Interactive map using plain Leaflet (no react-leaflet)
 *
 * We use plain Leaflet via useEffect instead of react-leaflet because:
 * - react-leaflet's MapContainer has persistent issues with React's
 *   component lifecycle (double-init errors, StrictMode conflicts).
 * - Plain Leaflet gives us full control over init and teardown.
 *
 * The map is created once on mount and properly destroyed on unmount.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import assessmentService from '../services/assessmentService';
import { ROXAS_CENTER, DEFAULT_ZOOM, ROXAS_LEAFLET_BOUNDS, MUNICIPALITY, PROVINCE } from '../utils/roxasConfig';

const FERTILITY_COLORS = {
  fertile:  '#22c55e',
  moderate: '#f59e0b',
  poor:     '#ef4444',
};

const FERTILITY_LABELS = {
  fertile:  'Fertile',
  moderate: 'Moderate',
  poor:     'Poor',
};

export default function MapView() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const mapRef      = useRef(null);  // Leaflet map instance
  const mapDivRef   = useRef(null);  // DOM element for the map
  const navigate    = useNavigate();

  // ── Load assessment data ──────────────────────────────────────
  useEffect(() => {
    assessmentService.list(100)
      .then(res => {
        setAssessments(
          (res.data || []).filter(a => a.location?.latitude && a.location?.longitude)
        );
      })
      .catch(() => setError('Could not load assessment locations.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Initialize Leaflet map after data loads ───────────────────
  useEffect(() => {
    if (loading) return;             // Wait until data is ready
    if (!mapDivRef.current) return;  // DOM node must exist
    if (mapRef.current) return;      // Already initialized

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      const leaflet = L.default || L;

      // Safety check — if already initialized somehow, remove it first
      if (mapDivRef.current._leaflet_id) {
        mapDivRef.current._leaflet_id = null;
      }

      // Create the map
      const map = leaflet.map(mapDivRef.current, {
        center:      ROXAS_CENTER,
        zoom:        DEFAULT_ZOOM,
        zoomControl: true,
        // Keep the map focused on the Roxas service area
        maxBounds:        ROXAS_LEAFLET_BOUNDS,
        maxBoundsViscosity: 0.7,   // Gently resist panning away from Roxas
        minZoom:          11,
      });

      // Add OpenStreetMap tiles
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Draw the Roxas municipal boundary rectangle
      leaflet.rectangle(ROXAS_LEAFLET_BOUNDS, {
        color:       '#16a34a',
        weight:      2,
        fill:        false,
        dashArray:   '6 6',
      }).addTo(map).bindTooltip(`${MUNICIPALITY}, ${PROVINCE} service area`, { sticky: true });

      // Force Leaflet to recalculate container size after mount.
      setTimeout(() => map.invalidateSize(), 100);

      // Add a marker for each assessment
      assessments.forEach(a => {
        const color = FERTILITY_COLORS[a.fertilityClass?.toLowerCase()] || '#6b7280';
        const label = FERTILITY_LABELS[a.fertilityClass?.toLowerCase()] || a.fertilityClass || '—';

        const marker = leaflet.circleMarker(
          [a.location.latitude, a.location.longitude],
          {
            radius:      10,
            fillColor:   color,
            fillOpacity: 0.85,
            color:       '#fff',
            weight:      2,
          }
        );

        const popupHtml = `
          <div style="min-width:160px;font-family:sans-serif;font-size:13px">
            <div style="font-weight:700;margin-bottom:4px">${a.assessmentId || ''}</div>
            <span style="
              display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;
              font-weight:600;background:${color}22;color:${color}
            ">${label}</span>
            <div style="margin-top:4px;color:#374151">Score: ${a.fertilityScore ?? '—'}/100</div>
            ${a.location?.barangay ? `<div style="color:#6b7280;font-size:11px">${a.location.barangay}</div>` : ''}
            ${a.bestRootcrop ? `<div style="color:#16a34a;font-size:11px;margin-top:2px">🥇 ${a.bestRootcrop}</div>` : ''}
            <a
              href="/assessments/${a.assessmentId}"
              style="display:block;margin-top:6px;color:#2563eb;font-size:11px;font-weight:600"
              onclick="event.preventDefault();window.__soilsenseNavigate('${a.assessmentId}')"
            >View full result →</a>
          </div>
        `;

        marker.bindPopup(popupHtml);
        marker.addTo(map);
      });

      // Expose navigate to popup onclick (popup lives outside React tree)
      window.__soilsenseNavigate = (id) => navigate(`/assessments/${id}`);

      mapRef.current = map;
    });

    // Cleanup: destroy the map when component unmounts
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      delete window.__soilsenseNavigate;
    };
  }, [loading, assessments]); // Re-run when data loads

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size="lg" message="Loading map data..." />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessment Map</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {MUNICIPALITY}, {PROVINCE} · {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} with GPS coordinates
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {Object.entries(FERTILITY_COLORS).map(([cls, color]) => (
          <div key={cls} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{cls}</span>
          </div>
        ))}
      </div>

      {/* Map container — plain div, Leaflet manages the rest */}
      <div
        ref={mapDivRef}
        className="rounded-2xl border border-gray-200 shadow-sm"
        style={{ height: '460px', width: '100%', position: 'relative', zIndex: 0 }}
      />

      {assessments.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No assessments with location data yet.</p>
          <p className="text-xs mt-1">
            Allow GPS access when creating a new assessment to see locations here.
          </p>
        </div>
      )}

    </div>
  );
}

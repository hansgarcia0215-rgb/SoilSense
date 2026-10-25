/**
 * MapView.jsx — Assessment locations and local soil-fertility insights.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, CalendarDays, LocateFixed, MapPin, Plus, RefreshCw,
  Search, Sprout, TrendingUp,
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import assessmentService from '../services/assessmentService';
import {
  DEFAULT_ZOOM, MUNICIPALITY, PROVINCE, ROXAS_BOUNDS, ROXAS_CENTER, ROXAS_LEAFLET_BOUNDS,
} from '../utils/roxasConfig';

const FERTILITY = {
  fertile: { label: 'Fertile', color: '#22c55e' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  poor: { label: 'Poor', color: '#ef4444' },
};

function hasCoordinates(assessment) {
  const { latitude, longitude } = assessment.location || {};
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    && latitude !== null && longitude !== null && latitude !== '' && longitude !== '';
}

function getTimestamp(value) {
  if (value?._seconds) return value._seconds * 1000;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getScore(value) {
  if (value == null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);
  return timestamp
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(timestamp)
    : 'Date unavailable';
}

function normalizedClass(value) {
  const key = String(value || '').toLowerCase();
  return FERTILITY[key] ? key : 'unknown';
}

function isWithinServiceArea(assessment) {
  if (typeof assessment.location?.withinServiceArea === 'boolean') {
    return assessment.location.withinServiceArea;
  }

  const latitude = Number(assessment.location?.latitude);
  const longitude = Number(assessment.location?.longitude);
  return latitude >= ROXAS_BOUNDS.minLat && latitude <= ROXAS_BOUNDS.maxLat
    && longitude >= ROXAS_BOUNDS.minLng && longitude <= ROXAS_BOUNDS.maxLng;
}

function StatCard({ icon: Icon, label, value, helper, iconClass = 'text-green-700 bg-green-50' }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{helper}</p>
    </div>
  );
}

function createPopup(leaflet, assessment, navigate) {
  const popup = leaflet.DomUtil.create('div');
  popup.style.minWidth = '190px';
  popup.style.fontFamily = 'sans-serif';
  popup.style.fontSize = '13px';

  const title = leaflet.DomUtil.create('strong', '', popup);
  title.textContent = assessment.assessmentId || 'Soil assessment';

  const fertility = normalizedClass(assessment.fertilityClass);
  const badge = leaflet.DomUtil.create('span', '', popup);
  badge.textContent = FERTILITY[fertility]?.label || 'Unclassified';
  badge.style.cssText = `display:block;width:max-content;margin-top:6px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;color:${FERTILITY[fertility]?.color || '#6b7280'};background:${FERTILITY[fertility]?.color || '#6b7280'}22`;

  const details = [
    `Score: ${assessment.fertilityScore ?? '—'} / 100`,
    assessment.location?.barangay || 'Barangay not recorded',
    `GPS: ${Number(assessment.location.latitude).toFixed(6)}, ${Number(assessment.location.longitude).toFixed(6)}`,
    formatDate(assessment.createdAt),
    assessment.bestRootcrop ? `Top crop: ${assessment.bestRootcrop}` : null,
  ].filter(Boolean);

  if (!isWithinServiceArea(assessment)) {
    const warning = leaflet.DomUtil.create('div', '', popup);
    warning.textContent = 'Outside Roxas service area';
    warning.style.cssText = 'margin-top:7px;padding:5px 7px;border-radius:6px;background:#fff7ed;color:#c2410c;font-size:11px;font-weight:700';
  }

  details.forEach(text => {
    const line = leaflet.DomUtil.create('div', '', popup);
    line.textContent = text;
    line.style.cssText = 'margin-top:5px;color:#4b5563;font-size:12px';
  });

  const button = leaflet.DomUtil.create('button', '', popup);
  button.type = 'button';
  button.textContent = 'Open assessment';
  button.style.cssText = 'margin-top:9px;padding:0;border:0;background:none;color:#15803d;font-size:12px;font-weight:700;cursor:pointer';
  button.addEventListener('click', () => navigate(`/assessments/${encodeURIComponent(assessment.assessmentId)}`));
  return popup;
}

export default function MapView() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [fertilityFilter, setFertilityFilter] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [mapEpoch, setMapEpoch] = useState(0);
  const mapRef = useRef(null);
  const mapDivRef = useRef(null);
  const markerLayerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    assessmentService.list(100)
      .then(response => {
        if (!cancelled) setAssessments(response.data || []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load assessment locations. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const mappedAssessments = useMemo(
    () => assessments.filter(hasCoordinates),
    [assessments]
  );

  const outsideAreaAssessments = useMemo(
    () => mappedAssessments.filter(assessment => !isWithinServiceArea(assessment)),
    [mappedAssessments]
  );

  const barangays = useMemo(() => [...new Set(
    mappedAssessments.map(item => item.location?.barangay).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b)), [mappedAssessments]);

  const filteredAssessments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mappedAssessments.filter(item => {
      const matchesClass = fertilityFilter === 'all'
        || normalizedClass(item.fertilityClass) === fertilityFilter;
      const matchesBarangay = barangayFilter === 'all'
        || item.location?.barangay === barangayFilter;
      const matchesSearch = !query
        || String(item.assessmentId || '').toLowerCase().includes(query)
        || String(item.location?.barangay || '').toLowerCase().includes(query)
        || String(item.bestRootcrop || '').toLowerCase().includes(query);
      return matchesClass && matchesBarangay && matchesSearch;
    });
  }, [mappedAssessments, fertilityFilter, barangayFilter, search]);

  const stats = useMemo(() => {
    const classCounts = { fertile: 0, moderate: 0, poor: 0 };
    const scores = [];
    mappedAssessments.forEach(item => {
      const fertility = normalizedClass(item.fertilityClass);
      if (classCounts[fertility] !== undefined) classCounts[fertility] += 1;
      const score = getScore(item.fertilityScore);
      if (score !== null) scores.push(score);
    });
    return {
      classCounts,
      averageScore: scores.length
        ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
        : '—',
      coverage: assessments.length ? Math.round(mappedAssessments.length / assessments.length * 100) : 0,
    };
  }, [assessments.length, mappedAssessments]);

  const barangayInsights = useMemo(() => {
    const grouped = new Map();
    mappedAssessments.forEach(item => {
      const name = item.location?.barangay || 'Barangay not recorded';
      const entry = grouped.get(name) || { name, total: 0, scores: [], classes: { fertile: 0, moderate: 0, poor: 0 } };
      entry.total += 1;
      const score = getScore(item.fertilityScore);
      if (score !== null) entry.scores.push(score);
      const fertility = normalizedClass(item.fertilityClass);
      if (entry.classes[fertility] !== undefined) entry.classes[fertility] += 1;
      grouped.set(name, entry);
    });
    return [...grouped.values()]
      .map(entry => ({
        ...entry,
        averageScore: entry.scores.length
          ? (entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length).toFixed(1)
          : '—',
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [mappedAssessments]);

  const recentAssessments = useMemo(
    () => [...filteredAssessments]
      .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
      .slice(0, 5),
    [filteredAssessments]
  );

  useEffect(() => {
    if (loading || !mapDivRef.current || mapRef.current) return undefined;

    let cancelled = false;
    let map;
    let resizeTimer;
    import('leaflet').then(module => {
      if (cancelled || !mapDivRef.current) return;
      const leaflet = module.default || module;
      map = leaflet.map(mapDivRef.current, {
        center: ROXAS_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      leaflet.rectangle(ROXAS_LEAFLET_BOUNDS, {
        color: '#16a34a',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.04,
        dashArray: '6 6',
      }).addTo(map).bindTooltip(`${MUNICIPALITY}, ${PROVINCE} service area`);
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setMapEpoch(epoch => epoch + 1);
      resizeTimer = window.setTimeout(() => map?.invalidateSize(), 100);
    }).catch(() => {
      if (!cancelled) setError('The map could not be initialized. Refresh the page to try again.');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      if (map) map.remove();
      if (mapRef.current === map) mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [loading]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapEpoch || !map || !markerLayer) return;
    let cancelled = false;

    import('leaflet').then(module => {
      if (cancelled || !mapRef.current || !markerLayerRef.current) return;
      const leaflet = module.default || module;
      markerLayer.clearLayers();
      const bounds = [];

      filteredAssessments.forEach(assessment => {
        const latitude = Number(assessment.location.latitude);
        const longitude = Number(assessment.location.longitude);
        const fertility = normalizedClass(assessment.fertilityClass);
        const color = FERTILITY[fertility]?.color || '#6b7280';
        const outsideArea = !isWithinServiceArea(assessment);
        const marker = leaflet.marker([latitude, longitude], {
          icon: leaflet.divIcon({
            className: 'soilsense-assessment-pin',
            html: `<span style="position:relative;display:block;width:24px;height:24px;border:3px solid ${outsideArea ? '#c2410c' : '#fff'};border-radius:50% 50% 50% 0;background:${color};box-shadow:0 2px 8px #0006;transform:rotate(-45deg)"><span style="display:block;width:6px;height:6px;margin:6px auto;border-radius:50%;background:#fff"></span>${outsideArea ? '<span style="position:absolute;top:-9px;right:-13px;display:flex;width:16px;height:16px;align-items:center;justify-content:center;border:1px solid white;border-radius:50%;background:#c2410c;color:#fff;font:bold 11px sans-serif;transform:rotate(45deg)">!</span>' : ''}</span>`,
            iconSize: outsideArea ? [40, 42] : [30, 38],
            iconAnchor: outsideArea ? [20, 40] : [15, 36],
            popupAnchor: [0, -38],
          }),
        });
        marker.bindTooltip(
          `${assessment.assessmentId || 'Assessment'} · ${FERTILITY[fertility]?.label || 'Unclassified'}${outsideArea ? ' · Outside Roxas service area' : ''}`,
          { direction: 'top', offset: [0, -7] }
        );
        marker.bindPopup(createPopup(leaflet, assessment, navigate));
        marker.addTo(markerLayer);
        bounds.push([latitude, longitude]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else {
        map.setView(ROXAS_CENTER, DEFAULT_ZOOM);
      }
    }).catch(() => {
      if (!cancelled) setError('Assessment markers could not be displayed.');
    });

    return () => { cancelled = true; };
  }, [filteredAssessments, mapEpoch, navigate]);

  if (loading) return (
    <div className="flex min-h-64 items-center justify-center">
      <LoadingSpinner size="lg" message="Loading local assessment insights..." />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <MapPin className="h-4 w-4" />
            Local soil overview
          </div>
          <h1 className="mt-1 text-2xl font-black text-gray-900">Assessment Map</h1>
          <p className="mt-1 text-sm text-gray-500">
            Explore recent soil results by location across {MUNICIPALITY}, {PROVINCE}.
            {' '}Showing the latest {assessments.length} assessment records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey(value => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link
            to="/assess/new"
            className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            <Plus className="h-4 w-4" /> New assessment
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {outsideAreaAssessments.length > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">
              {outsideAreaAssessments.length} mapped assessment{outsideAreaAssessments.length === 1 ? '' : 's'} outside the Roxas service area
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              These GPS points are shown on the map with an alert pin. SoilSense recommendations are calibrated for Roxas; verify the recorded location before relying on results from outside the service area.
              {outsideAreaAssessments.length === 1 && (
                <> Latest point: {Number(outsideAreaAssessments[0].location.latitude).toFixed(6)}, {Number(outsideAreaAssessments[0].location.longitude).toFixed(6)}.</>
              )}
            </p>
          </div>
        </div>
      )}

      <section aria-label="Assessment summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={MapPin}
          label="GPS-mapped results"
          value={`${mappedAssessments.length} / ${assessments.length}`}
          helper={`${stats.coverage}% of recent assessments have GPS`}
        />
        <StatCard
          icon={TrendingUp}
          label="Average fertility score"
          value={stats.averageScore}
          helper="Across assessments with a score"
          iconClass="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={Sprout}
          label="Fertile results"
          value={stats.classCounts.fertile}
          helper="Mapped locations classified fertile"
          iconClass="bg-green-50 text-green-700"
        />
        <StatCard
          icon={Activity}
          label="Poor / moderate"
          value={`${stats.classCounts.poor} / ${stats.classCounts.moderate}`}
          helper="Mapped results that may need attention"
          iconClass="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Explore assessment locations</h2>
            <p className="text-xs text-gray-500">Select a marker for score, date, barangay, and top crop.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Showing {filteredAssessments.length} of {mappedAssessments.length} mapped
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,0.7fr)_minmax(180px,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search ID, barangay, or crop"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <label className="sr-only" htmlFor="map-fertility-filter">Filter by fertility</label>
          <select
            id="map-fertility-filter"
            value={fertilityFilter}
            onChange={event => setFertilityFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All fertility classes</option>
            {Object.entries(FERTILITY).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="map-barangay-filter">Filter by barangay</label>
          <select
            id="map-barangay-filter"
            value={barangayFilter}
            onChange={event => setBarangayFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All barangays</option>
            {barangays.map(barangay => <option key={barangay} value={barangay}>{barangay}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div
            ref={mapDivRef}
            aria-label="Map of soil assessment results in Roxas, Oriental Mindoro"
            className="h-[420px] w-full sm:h-[560px]"
            style={{ position: 'relative', zIndex: 0 }}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-600">
            {Object.entries(FERTILITY).map(([key, value]) => (
              <span key={key} className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: value.color }} />
                {value.label} ({stats.classCounts[key]})
              </span>
            ))}
            <span className="ml-auto text-gray-400">Boundary is approximate · OpenStreetMap</span>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Barangay snapshot</h2>
                <p className="text-xs text-gray-500">Most assessed areas in this map</p>
              </div>
              <LocateFixed className="h-5 w-5 text-green-700" />
            </div>
            {barangayInsights.length ? (
              <div className="space-y-2">
                {barangayInsights.map(item => {
                  const share = Math.max(8, item.total / mappedAssessments.length * 100);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setBarangayFilter(item.name === 'Barangay not recorded' ? 'all' : item.name)}
                      className="w-full rounded-xl border border-gray-100 p-3 text-left transition hover:border-green-200 hover:bg-green-50/40"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-800">{item.name}</span>
                        <span className="shrink-0 text-xs text-gray-500">{item.total} result{item.total === 1 ? '' : 's'}</span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-green-500" style={{ width: `${share}%` }} />
                      </span>
                      <span className="mt-2 flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-gray-500">
                        <span>Average score: <strong className="text-gray-700">{item.averageScore}</strong></span>
                        <span className="inline-flex gap-1.5">
                          {Object.entries(FERTILITY).map(([key, value]) => item.classes[key] > 0 && (
                            <span key={key} style={{ color: value.color }}>
                              {item.classes[key]} {value.label.toLowerCase()}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                Barangay insights will appear when assessment locations are available.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Recent mapped results</h2>
                <p className="text-xs text-gray-500">Open a record for its complete recommendations</p>
              </div>
              <CalendarDays className="h-5 w-5 text-blue-700" />
            </div>
            {recentAssessments.length ? (
              <ul className="divide-y divide-gray-100">
                {recentAssessments.map(item => {
                  const fertility = normalizedClass(item.fertilityClass);
                  const config = FERTILITY[fertility];
                  return (
                    <li key={item.assessmentId}>
                      <Link
                        to={`/assessments/${encodeURIComponent(item.assessmentId)}`}
                        className="block py-3 first:pt-0 last:pb-0"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gray-800">
                            {item.assessmentId || 'Soil assessment'}
                          </span>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{ color: config?.color || '#6b7280', backgroundColor: `${config?.color || '#6b7280'}22` }}>
                            {config?.label || 'Unclassified'}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                          <span className="truncate">{item.location?.barangay || 'Barangay not recorded'}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </span>
                        <span className="mt-1 block text-xs text-gray-600">
                          Score: {item.fertilityScore ?? '—'} / 100
                          {item.bestRootcrop ? ` · Top crop: ${item.bestRootcrop}` : ''}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">No mapped results match these filters.</p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFertilityFilter('all'); setBarangayFilter('all'); }}
                  className="mt-2 text-xs font-bold text-green-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </aside>
      </section>

      {assessments.length > mappedAssessments.length && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          {assessments.length - mappedAssessments.length} of the latest {assessments.length} records do not have usable GPS coordinates and cannot be placed on the map. Enable location access during a new assessment to add a map point.
        </p>
      )}

      {assessments.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-8 text-center">
          <MapPin className="mx-auto mb-2 h-9 w-9 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">No assessment data yet</p>
          <p className="mt-1 text-xs text-gray-500">Create a soil assessment and allow GPS access to begin building this local map.</p>
          <Link to="/assess/new" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-700">
            <Plus className="h-4 w-4" /> Create assessment
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * NewAssessment.jsx — Production multi-step soil assessment wizard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, AlertTriangle, WifiOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import useGeolocation from '../hooks/useGeolocation';
import useSensorPolling from '../hooks/useSensorPolling';
import assessmentService from '../services/assessmentService';
import api from '../services/api';

import ImageCapture    from '../components/assessment/ImageCapture';
import SensorStatus    from '../components/assessment/SensorStatus';
import ProcessingScreen from '../components/assessment/ProcessingScreen';

const STEPS = [
  { id: 1, label: 'Photo',    icon: '📸' },
  { id: 2, label: 'Soil Data', icon: '📡' },
  { id: 3, label: 'Location', icon: '📍' },
  { id: 4, label: 'Analyze',  icon: '🔬' },
];

export default function NewAssessment() {
  const navigate = useNavigate();
  const { user, preferredDeviceId } = useAuth();
  const deviceId = preferredDeviceId || 'SS-ESP32-001';

  const [step, setStep]         = useState(1);
  const [processing, setProcessing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [notes, setNotes]         = useState('');
  const [manualPH, setManualPH]   = useState('');
  const [manualMoisture, setManualMoisture] = useState('');
  const [manualTemperature, setManualTemperature] = useState('');
  const [serviceHealth, setServiceHealth] = useState(null);

  const geo    = useGeolocation();
  const sensor = useSensorPolling(deviceId, true);

  useEffect(() => {
    api.get('/health/services')
      .then(r => setServiceHealth(r.data.services))
      .catch(() => setServiceHealth(null));
  }, []);

  const canProceed = () => step === 1 ? !!imageFile : true;
  const next = () => step < STEPS.length ? setStep(s => s + 1) : handleSubmit();
  const back = () => step > 1 && setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!imageFile) { toast.error('Please capture a soil image first.'); setStep(1); return; }
    setProcessing(true);
    const startedAt = Date.now();
    try {
      const soilPH = sensor.connected ? sensor.sensor?.soilPH
        : manualPH !== '' ? parseFloat(manualPH) : undefined;
      const soilMoisture = sensor.connected ? sensor.sensor?.soilMoisture
        : manualMoisture !== '' ? parseFloat(manualMoisture) : undefined;
      const soilTemperature = sensor.connected ? sensor.sensor?.soilTemperature
        : manualTemperature !== '' ? parseFloat(manualTemperature) : undefined;

      const result = await assessmentService.analyze({
        imageFile, latitude: geo.position?.latitude, longitude: geo.position?.longitude,
        soilPH, soilMoisture, soilTemperature,
        deviceId: sensor.connected ? deviceId : undefined,
        barangay: user?.barangay, notes,
      });

      // Keep the analysis screen readable even when the API responds fast
      const MIN_SCREEN_MS = 1500;
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SCREEN_MS) {
        await new Promise(r => setTimeout(r, MIN_SCREEN_MS - elapsed));
      }

      toast.success('Assessment complete!');
      navigate(`/assessments/${result.assessmentId}`);
    } catch (err) {
      setProcessing(false);
      toast.error(err.response?.data?.message || 'Assessment failed. Please try again.');
    }
  };

  if (processing) return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <ProcessingScreen />
    </div>
  );

  const imgOffline   = !!serviceHealth && serviceHealth.imageProcessing?.status !== 'online';
  const fuzzyOffline = !!serviceHealth && serviceHealth.fuzzyEngine?.status !== 'online';
  const anyOffline   = imgOffline || fuzzyOffline;

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black text-gray-900">New Soil Assessment</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Device:{' '}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded-lg">{deviceId}</code>
        </p>
      </div>

      {/* Service health warning */}
      {anyOffline && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl
                        p-4 text-sm animate-scale-in">
          <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 mb-1">Some services are unavailable</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {imgOffline && (
                <li>
                  • Image processing — {serviceHealth?.imageProcessing?.message || 'features will use defaults'}
                </li>
              )}
              {fuzzyOffline && (
                <li>
                  • Fuzzy engine — {serviceHealth?.fuzzyEngine?.message || 'results will use fallback'}
                </li>
              )}
            </ul>
            <p className="text-xs text-amber-600 mt-1.5">
              You can still proceed but results will have limited accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Step progress */}
      <StepProgress steps={STEPS} current={step} />

      {/* Step content card */}
      <div className="card shadow-card-lg animate-scale-in" key={step}>
        {step === 1 && (
          <StepPhoto imageFile={imageFile} onImageSelected={setImageFile}
                     notes={notes} setNotes={setNotes} imgOffline={imgOffline} />
        )}
        {step === 2 && (
          <StepSensorData sensor={sensor} deviceId={deviceId}
                          manualPH={manualPH} setManualPH={setManualPH}
                          manualMoisture={manualMoisture} setManualMoisture={setManualMoisture}
                          manualTemperature={manualTemperature} setManualTemperature={setManualTemperature} />
        )}
        {step === 3 && <StepLocation geo={geo} />}
        {step === 4 && (
          <StepReview imageFile={imageFile} geo={geo} sensor={sensor}
                      manualPH={manualPH} manualMoisture={manualMoisture}
                      manualTemperature={manualTemperature}
                      fuzzyOffline={fuzzyOffline} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={back} disabled={step === 1}
          className="btn-ghost disabled:invisible">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={next} disabled={!canProceed()} className="btn-primary">
          {step === STEPS.length
            ? <><span>🔬</span> Analyze Soil</>
            : <>Next <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function StepProgress({ steps, current }) {
  return (
    <div className="flex items-center px-1">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                            font-bold text-sm transition-all duration-300
                            ${current === s.id
                              ? 'bg-gradient-brand text-white shadow-glow-sm scale-110'
                              : current > s.id
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'}`}>
              {current > s.id ? '✓' : s.icon}
            </div>
            <span className={`text-[10px] font-semibold transition-colors duration-200
              ${current === s.id ? 'text-green-700' :
                current > s.id ? 'text-green-500' : 'text-gray-500'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500
              ${current > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StepPhoto({ imageFile, onImageSelected, notes, setNotes, imgOffline }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-gray-900 mb-1">📸 Capture Soil Photo</h2>
        <p className="text-sm text-gray-500">Take a clear photo of the soil you want to assess.</p>
      </div>
      {imgOffline && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100
                        rounded-xl p-3 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Image processing is offline — photo will upload but features won't be extracted.
        </div>
      )}
      <ImageCapture onImageSelected={onImageSelected} imageFile={imageFile} />
      <div>
        <label className="input-label">Notes (optional)</label>
        <textarea className="input-field resize-none text-sm" rows={2}
          placeholder="e.g. Near the eastern boundary, after rainfall..."
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      {!imageFile && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> A soil photo is required to continue.
        </p>
      )}
    </div>
  );
}

function StepSensorData({ sensor, deviceId, manualPH, setManualPH, manualMoisture, setManualMoisture,
                          manualTemperature, setManualTemperature }) {
  const [showManual, setShowManual] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-gray-900 mb-1">📡 Soil Sensor Data</h2>
        <p className="text-sm text-gray-500">
          pH, moisture, and temperature improve accuracy. Connect your ESP32 or enter manually.
        </p>
      </div>
      <SensorStatus sensor={sensor.sensor} connected={sensor.connected}
                    loading={sensor.loading} onRefresh={sensor.refresh} />
      {!sensor.connected && (
        <p className="text-[11px] text-gray-500">
          Polling <code className="font-mono bg-gray-100 px-1 rounded">{deviceId}</code> —
          change in <a href="/settings" className="text-blue-500 hover:underline">Settings</a>
        </p>
      )}
      <div>
        <button onClick={() => setShowManual(!showManual)}
          className="text-sm text-blue-600 hover:text-blue-700 font-semibold
                     flex items-center gap-1.5 transition-colors">
          {showManual ? '▲' : '▼'} Enter values manually
        </button>
        {showManual && (
          <div className="mt-3 grid grid-cols-3 gap-3 animate-slide-down">
            <div>
              <label className="input-label">Soil pH (0–14)</label>
              <input type="number" className="input-field" placeholder="6.2"
                min="0" max="14" step="0.1"
                value={manualPH} onChange={e => setManualPH(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Moisture (%)</label>
              <input type="number" className="input-field" placeholder="57"
                min="0" max="100" step="1"
                value={manualMoisture} onChange={e => setManualMoisture(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Temp. (°C)</label>
              <input type="number" className="input-field" placeholder="26.5"
                min="-10" max="80" step="0.1"
                value={manualTemperature} onChange={e => setManualTemperature(e.target.value)} />
            </div>
          </div>
        )}
      </div>
      <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700 leading-relaxed">
        <strong>Why this matters:</strong> pH and moisture feed into the fuzzy logic engine.
        Temperature helps evaluate crop suitability — many tropical crops have specific
        temperature requirements for optimal growth.
      </div>
    </div>
  );
}

function StepLocation({ geo }) {
  const outsideArea = geo.position && geo.position.withinServiceArea === false;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-gray-900 mb-1">📍 Confirm Location</h2>
        <p className="text-sm text-gray-500">
          SoilSense serves <strong>Roxas, Oriental Mindoro</strong> only.
        </p>
      </div>
      {geo.position ? (
        <div className={`rounded-2xl p-4 border-2 transition-all duration-300
          ${outsideArea ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200'}`}>
          <div className={`flex items-center gap-2 font-bold text-sm mb-2
            ${outsideArea ? 'text-amber-700' : 'text-green-700'}`}>
            <MapPin className="w-4 h-4" />
            {outsideArea ? '⚠️ Outside Roxas boundary' : '✓ Within Roxas service area'}
          </div>
          <p className={`text-sm font-mono ${outsideArea ? 'text-amber-600' : 'text-green-600'}`}>
            {geo.position.latitude.toFixed(5)}, {geo.position.longitude.toFixed(5)}
          </p>
          <p className={`text-xs mt-1 ${outsideArea ? 'text-amber-400' : 'text-green-400'}`}>
            Accuracy: ±{Math.round(geo.position.accuracy)}m
          </p>
          {outsideArea && (
            <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
              Recommendations are calibrated for Roxas. Results may be less relevant here, but you can still proceed.
            </p>
          )}
        </div>
      ) : geo.error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          <p className="font-bold mb-1">Location unavailable</p>
          <p className="text-xs text-amber-600">{geo.error}</p>
          <p className="text-xs mt-2 text-amber-500">You can continue without location.</p>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Allow location access for Roxas-specific recommendations</p>
          <button onClick={geo.request} disabled={geo.loading}
            className="btn-secondary text-sm px-5 py-2.5">
            <MapPin className="w-4 h-4" />
            {geo.loading ? 'Getting location...' : 'Get My Location'}
          </button>
        </div>
      )}
      <p className="text-[11px] text-gray-500">
        GPS coordinates are stored with your assessment only and not shared externally.
      </p>
    </div>
  );
}

function StepReview({ imageFile, geo, sensor, manualPH, manualMoisture, manualTemperature, fuzzyOffline }) {
  const hasPH       = sensor.connected ? sensor.sensor?.soilPH != null : manualPH !== '';
  const hasMoisture = sensor.connected ? sensor.sensor?.soilMoisture != null : manualMoisture !== '';
  const hasTemp     = sensor.connected ? sensor.sensor?.soilTemperature != null : manualTemperature !== '';

  const phVal   = hasPH   ? (sensor.connected ? sensor.sensor?.soilPH?.toFixed(1)         : manualPH)         : 'Not provided';
  const moistVal= hasMoisture ? (sensor.connected ? `${sensor.sensor?.soilMoisture?.toFixed(0)}%` : `${manualMoisture}%`) : 'Not provided';
  const tempVal = hasTemp ? (sensor.connected ? `${sensor.sensor?.soilTemperature?.toFixed(1)}°C` : `${manualTemperature}°C`) : 'Not provided';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-gray-900 mb-1">🔬 Ready to Analyze</h2>
        <p className="text-sm text-gray-500">Review your inputs, then press Analyze Soil to start.</p>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Soil Image',   value: imageFile?.name || '—', ok: !!imageFile, required: true },
          { label: 'Location',     value: geo.position ? `${geo.position.latitude.toFixed(4)}, ${geo.position.longitude.toFixed(4)}` : 'Not available', ok: !!geo.position },
          { label: 'Soil pH',      value: phVal,   ok: hasPH },
          { label: 'Moisture',     value: moistVal, ok: hasMoisture },
          { label: 'Temperature',  value: tempVal,  ok: hasTemp },
        ].map(item => (
          <div key={item.label}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl
                       bg-gray-50 border border-gray-100">
            <span className="text-sm text-gray-500 font-medium">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 max-w-48 truncate">{item.value}</span>
              {item.ok
                ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                : item.required
                  ? <div className="w-4 h-4 rounded-full border-2 border-red-300 flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
            </div>
          </div>
        ))}
      </div>
      {fuzzyOffline && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200
                        rounded-xl p-3 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Fuzzy engine is offline — results will use a fallback. Start the fuzzy engine (port 5002) for accuracy.
        </div>
      )}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200
                      rounded-2xl p-4 text-sm text-green-700">
        🌱 Press <strong>Analyze Soil</strong> to start cloud processing.
        Results are usually ready in under 10 seconds.
      </div>
    </div>
  );
}

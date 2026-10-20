/**
 * SensorStatus.jsx — ESP32 connection status with pH, Moisture, Temperature
 */

import { Wifi, WifiOff, RefreshCw, Thermometer } from 'lucide-react';

export default function SensorStatus({ sensor, connected, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Checking sensor...
      </div>
    );
  }

  if (!connected || !sensor) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-sm font-semibold text-gray-500">ESP32 Not Connected</span>
          <WifiOff className="w-4 h-4 text-gray-400 ml-auto" />
        </div>
        <p className="text-xs text-gray-400 mb-2">
          {sensor?.isStale
            ? `Last reading was ${sensor.secondsAgo}s ago — device may have disconnected.`
            : 'No sensor detected. Assessment will use image data only.'}
        </p>
        {sensor && (
          <p className="text-xs text-gray-400 font-mono">
            pH {sensor.soilPH?.toFixed(1)} · {sensor.soilMoisture?.toFixed(0)}%
            {sensor.soilTemperature != null && ` · ${sensor.soilTemperature?.toFixed(1)}°C`}
          </p>
        )}
        <button onClick={onRefresh}
          className="mt-2.5 text-xs text-blue-600 hover:text-blue-700
                     flex items-center gap-1 font-semibold transition-colors">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  const hasTemp = sensor.soilTemperature != null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-bold text-green-700">ESP32 Connected</span>
        <Wifi className="w-4 h-4 text-green-500 ml-auto" />
      </div>

      {/* Reading tiles */}
      <div className={`grid gap-2 ${hasTemp ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* pH */}
        <div className="bg-white rounded-xl p-3 text-center border border-green-100
                        hover:border-green-300 transition-colors">
          <div className="text-xl font-black text-blue-600 tabular-nums">
            {sensor.soilPH?.toFixed(1)}
          </div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
            Soil pH
          </div>
        </div>

        {/* Moisture */}
        <div className="bg-white rounded-xl p-3 text-center border border-green-100
                        hover:border-green-300 transition-colors">
          <div className="text-xl font-black text-teal-600 tabular-nums">
            {sensor.soilMoisture?.toFixed(0)}<span className="text-sm font-medium text-gray-300">%</span>
          </div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
            Moisture
          </div>
        </div>

        {/* Temperature — only shown if available */}
        {hasTemp && (
          <div className="bg-white rounded-xl p-3 text-center border border-green-100
                          hover:border-green-300 transition-colors">
            <div className="text-xl font-black text-orange-500 tabular-nums">
              {sensor.soilTemperature?.toFixed(1)}<span className="text-sm font-medium text-gray-300">°C</span>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
              Temperature
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-green-600 mt-2.5 text-center font-medium">
        {sensor.statusMessage}
      </p>
    </div>
  );
}

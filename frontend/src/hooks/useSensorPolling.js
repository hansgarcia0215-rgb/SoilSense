/**
 * useSensorPolling.js — React hook for ESP32 sensor data polling
 *
 * What it does:
 *   Polls the backend API every N seconds to get the latest sensor
 *   reading for a given ESP32 device. Returns the current reading,
 *   connection status, and a manual refresh function.
 *
 * Usage:
 *   const { sensor, connected, loading } = useSensorPolling('SS-ESP32-001');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const POLL_INTERVAL_MS = 30000;   // Poll every 30 seconds to limit unnecessary API traffic
const DEFAULT_DEVICE   = 'SS-ESP32-001';

export default function useSensorPolling(deviceId = DEFAULT_DEVICE, enabled = true) {
  const [sensor, setSensor]       = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const intervalRef = useRef(null);

  const fetchLatest = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await api.get(`/sensors/latest/${deviceId}`);
      const data = res.data;

      if (data.found && !data.isStale) {
        setSensor({
          soilPH:           data.soilPH,
          soilMoisture:     data.soilMoisture,
          soilTemperature:  data.soilTemperature ?? null,
          secondsAgo:       data.secondsAgo,
          statusMessage:    data.statusMessage,
          deviceId:         data.deviceId,
        });
        setConnected(true);
      } else if (data.found && data.isStale) {
        setSensor({
          soilPH:           data.soilPH,
          soilMoisture:     data.soilMoisture,
          soilTemperature:  data.soilTemperature ?? null,
          secondsAgo:       data.secondsAgo,
          statusMessage:    data.statusMessage,
          isStale:          true,
        });
        setConnected(false);
      } else {
        setSensor(null);
        setConnected(false);
      }
      setError(null);
    } catch (err) {
      setError('Could not reach sensor endpoint.');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [deviceId, enabled]);

  // Start polling when hook mounts, stop when it unmounts
  useEffect(() => {
    if (!enabled) return;

    fetchLatest();  // Immediate first fetch
    intervalRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLatest, enabled]);

  return { sensor, connected, loading, error, refresh: fetchLatest };
}

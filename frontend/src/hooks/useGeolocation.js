/**
 * useGeolocation.js — React hook for GPS/browser geolocation
 *
 * What it does:
 *   Requests the browser's geolocation API and returns the current
 *   position (latitude, longitude) or an error message if unavailable.
 *
 * Why it exists:
 *   Centralizes GPS logic so it can be used in the assessment wizard
 *   and the map view without duplicating code.
 *
 * Usage:
 *   const { position, error, loading, request } = useGeolocation();
 *   // Call request() to trigger GPS prompt
 */

import { useState, useCallback } from 'react';
import { isWithinRoxas } from '../utils/roxasConfig';

export default function useGeolocation() {
  const [position, setPosition] = useState(null);    // { latitude, longitude, accuracy, withinServiceArea }
  const [error, setError]       = useState(null);    // Error message string
  const [loading, setLoading]   = useState(false);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location services.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPosition({
          latitude,
          longitude,
          accuracy,  // Accuracy in meters
          // Flag whether the reading falls inside the Roxas service area
          withinServiceArea: isWithinRoxas(latitude, longitude),
        });
        setLoading(false);
      },
      (err) => {
        // Map browser error codes to user-friendly messages
        const messages = {
          1: 'Location permission was denied. You can continue without location, but recommendations may be less specific.',
          2: 'Location is currently unavailable. Please try again.',
          3: 'Location request timed out. Please try again.',
        };
        setError(messages[err.code] || 'Unable to get your location.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout:            10000,   // 10 seconds
        maximumAge:         60000,   // Accept cached position up to 1 minute old
      }
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return { position, error, loading, request, clear };
}

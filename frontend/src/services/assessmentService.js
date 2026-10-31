/**
 * assessmentService.js — Assessment API calls
 *
 * Wraps all assessment-related HTTP requests so pages and components
 * don't need to build FormData or set headers manually.
 */

import api from './api';

const assessmentService = {

  /**
   * Submit a new soil assessment.
   * Sends image + sensor data + GPS as multipart/form-data.
   *
   * @param {Object} params
   * @param {File}   params.imageFile     - Soil image file object
   * @param {number} params.latitude      - GPS latitude (optional)
   * @param {number} params.longitude     - GPS longitude (optional)
   * @param {number} params.soilPH        - pH from sensor (optional)
   * @param {number} params.soilMoisture  - Moisture % from sensor (optional)
   * @param {string} params.deviceId      - ESP32 device ID (optional)
   * @param {string} params.barangay      - User's barangay
   * @param {string} params.notes         - Farmer's notes (optional)
   * @returns {Object} Full assessment result
   */
  async analyze({ imageFile, latitude, longitude, soilPH, soilMoisture, soilTemperature,
                  deviceId, barangay, notes }) {
    const form = new FormData();
    form.append('image', imageFile);

    if (latitude       != null) form.append('latitude',        latitude);
    if (longitude      != null) form.append('longitude',       longitude);
    if (soilPH         != null) form.append('soilPH',          soilPH);
    if (soilMoisture   != null) form.append('soilMoisture',    soilMoisture);
    if (soilTemperature != null) form.append('soilTemperature', soilTemperature);
    if (deviceId)               form.append('deviceId',        deviceId);
    if (barangay)               form.append('barangay',        barangay);
    if (notes)                  form.append('notes',           notes);

    const res = await api.post('/assessments/analyze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,  // 2-minute timeout for full cloud processing
    });
    return res.data;
  },

  /**
   * Get a paginated list of assessments.
   * @param {number} limit
   * @param {string} startAfter  - Firestore cursor for pagination
   */
  async list(limit = 20, startAfter = null) {
    const params = { limit };
    if (startAfter) params.startAfter = startAfter;
    const res = await api.get('/assessments', { params });
    return res.data;
  },

  /**
   * Get a single assessment's full detail.
   * @param {string} assessmentId
   */
  async getById(assessmentId) {
    const res = await api.get(`/assessments/${assessmentId}`);
    return res.data;
  },

  async generateFertilizerRecommendation(assessmentId) {
    const res = await api.post(`/assessments/${encodeURIComponent(assessmentId)}/fertilizer-recommendation`);
    return res.data;
  },

  async getImage(assessmentId, signal) {
    return api.get(`/assessments/${encodeURIComponent(assessmentId)}/image`, {
      responseType: 'blob',
      signal,
    });
  },

  /**
   * Enter a laboratory validation result for an assessment.
   * @param {string} assessmentId
   * @param {Object} labData - { labFertilityClass, labPH, labNitrogen, etc. }
   */
  async enterLabResult(assessmentId, labData) {
    const res = await api.post(`/assessments/${assessmentId}/lab-result`, labData);
    return res.data;
  },
};

export default assessmentService;

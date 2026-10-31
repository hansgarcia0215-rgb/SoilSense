const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const MAX_TEXT_LENGTH = 1000;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    recommendedActions: { type: 'ARRAY', items: { type: 'STRING' } },
    fertilizerGuidance: { type: 'STRING' },
    avoidActions: { type: 'ARRAY', items: { type: 'STRING' } },
    retestRecommendation: { type: 'STRING' },
    limitations: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'summary',
    'recommendedActions',
    'fertilizerGuidance',
    'avoidActions',
    'retestRecommendation',
    'limitations',
  ],
};

function boundedText(value, field, required = false) {
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw new Error(`Gemini recommendation has an invalid ${field}.`);
  }
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function boundedList(value, field) {
  if (!Array.isArray(value) || value.length > 8) {
    throw new Error(`Gemini recommendation has an invalid ${field}.`);
  }
  return value.map((item, index) => boundedText(item, `${field}[${index}]`, true));
}

function getPublicApiError(error) {
  const status = error.response?.status;
  const apiError = error.response?.data?.error;
  if (apiError?.status === 'API_KEY_INVALID' || /api.?key/i.test(apiError?.message || '')) {
    return 'Gemini rejected the API key. Check GEMINI_API_KEY on the SoilSense API service.';
  }
  if (status === 400) return 'Gemini rejected the request. Check the configured model and request settings.';
  if (status === 401 || status === 403) return 'Gemini rejected the API key. Check GEMINI_API_KEY on the SoilSense API service.';
  if (status === 429) return 'Gemini quota or rate limit was reached. Try again later or check your AI Studio quota.';
  if (status) return `Gemini returned HTTP ${status}. Try again later.`;
  if (error.code === 'ECONNABORTED') return 'Gemini took too long to respond. Try again later.';
  return 'The SoilSense API could not reach Gemini. Try again later.';
}

async function generateFertilizerRecommendation(assessmentContext) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured on the SoilSense API.');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const prompt = [
    'You are generating cautious, practical soil-nutrient management guidance for a farmer in Roxas, Oriental Mindoro, Philippines.',
    'Use only the assessment data provided below. Tailor the advice to the assessed fertility class and the top-ranked crop.',
    'This is a screening assessment, not a laboratory soil test. Never claim that image appearance, pH, moisture, or temperature measures soil nitrogen, phosphorus, or potassium.',
    'Do not invent numeric fertilizer rates, product dosages, local regulations, product labels, or citations. If laboratory N-P-K results are absent, state that numeric rates cannot be determined. Even when lab results are present, advise following locally verified crop recommendations.',
    'Recommend mature compost or fully composted manure only as an organic-matter amendment when appropriate. Do not prescribe a mineral fertilizer grade or amount without lab N-P-K results and locally verified crop guidance.',
    'Do not invent a crop-specific application calendar. The application timeline shown by the app is a general checklist; advise farmers to follow crop-stage recommendations from a municipal agricultural officer and the product label. Do not call a check-in date an automatic fertilizer application.',
    'Return concise farmer-friendly language. Include 3 to 5 recommendedActions, 0 to 4 avoidActions, and 1 to 3 limitations. Explain uncertainty and what further test would make the advice more reliable.',
    `Assessment data:\n${JSON.stringify(assessmentContext)}`,
  ].join('\n\n');

  let response;
  try {
    response = await axios.post(
      `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 25000,
      }
    );
  } catch (error) {
    const publicError = new Error(getPublicApiError(error));
    publicError.code = 'GEMINI_REQUEST_FAILED';
    publicError.status = error.response?.status;
    throw publicError;
  }

  const text = response.data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim();
  if (!text) {
    throw new Error('Gemini returned no recommendation text.');
  }

  let recommendation;
  try {
    recommendation = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned a recommendation that was not valid JSON.');
  }

  return {
    version: 2,
    summary: boundedText(recommendation.summary, 'summary', true),
    recommendedActions: boundedList(recommendation.recommendedActions, 'recommendedActions'),
    fertilizerGuidance: boundedText(recommendation.fertilizerGuidance, 'fertilizerGuidance', true),
    avoidActions: boundedList(recommendation.avoidActions, 'avoidActions'),
    retestRecommendation: boundedText(recommendation.retestRecommendation, 'retestRecommendation', true),
    limitations: boundedList(recommendation.limitations, 'limitations'),
    provider: 'Google Gemini',
    model: response.data?.modelVersion || model,
    source: 'AI-generated decision-support guidance; not a laboratory fertilizer prescription.',
    kind: 'gemini_ai',
    generatedAt: new Date(),
  };
}

module.exports = { generateFertilizerRecommendation };

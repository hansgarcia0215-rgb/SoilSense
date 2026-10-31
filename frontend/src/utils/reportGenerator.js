/**
 * reportGenerator.js — PDF soil assessment report generator
 *
 * Uses jsPDF + jsPDF-AutoTable.
 *
 * Note on the autoTable import:
 *   jspdf-autotable v3 registers itself on the jsPDF instance as doc.autoTable().
 *   Importing the default export and calling it as autoTable(doc, {...}) can
 *   break depending on the bundler. We import for the side-effect (plugin
 *   registration) AND keep a reference, then call via a safe wrapper that
 *   works with either API.
 */

import jsPDF from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';
import assessmentService from '../services/assessmentService';

// Color palette
const GREEN = [22, 163, 74];
const AMBER = [217, 119, 6];
const RED   = [220, 38, 38];
const GRAY  = [107, 114, 128];
const DARK  = [17, 24, 39];
const LIGHT = [249, 250, 251];

function getFertilityColor(cls) {
  if (!cls) return GRAY;
  const c = String(cls).toLowerCase();
  return c === 'fertile' ? GREEN : c === 'moderate' ? AMBER : RED;
}

// Safe number formatter — handles numbers, numeric strings, null, undefined
function fmtNum(v, digits = 1) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toFixed(digits);
}

// Call autoTable in a way that works with both the plugin and functional API
function runAutoTable(doc, options) {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTablePlugin === 'function') {
    autoTablePlugin(doc, options);
  } else {
    throw new Error('jspdf-autotable is not available.');
  }
  // finalY lives on doc.lastAutoTable regardless of API
  return doc.lastAutoTable ? doc.lastAutoTable.finalY : options.startY;
}

async function loadReportImage(assessmentId, imageUrl) {
  let imageBlob;
  if (assessmentId) {
    imageBlob = (await assessmentService.getImage(assessmentId)).data;
  } else {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`Image request returned HTTP ${response.status}.`);
    imageBlob = await response.blob();
  }

  const bitmap = await createImageBitmap(imageBlob);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.85),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function generatePDFReport(data) {
  if (!data) throw new Error('No assessment data to generate report from.');

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    const f      = data.fuzzyResult   || {};
    const sensor = data.sensorData    || {};
    const img    = data.imageFeatures || {};
    const loc    = data.location      || {};
    const imageUrl = data.imageData?.imageUrl;
    // Support both legacy and new crop field names
    const crops  = data.rootcropResults?.length
      ? data.rootcropResults
      : data.cropRecommendations || [];
    let uploadedImage = null;

    if (data.imageData?.hasImage || data.imageData?.imagePath || imageUrl) {
      try {
        uploadedImage = await loadReportImage(
          data.imageData?.hasImage || data.imageData?.imagePath ? data.assessmentId : null,
          imageUrl
        );
      } catch (err) {
        console.warn('[reportGenerator] Could not embed uploaded soil image:', err.message);
      }
    }

    // pH / moisture may come from sensor OR fuzzyInputs (manual entry)
    const phVal       = sensor.soilPH       ?? data.fuzzyInputs?.ph       ?? null;
    const moistureVal = sensor.soilMoisture ?? data.fuzzyInputs?.moisture ?? null;

    // Date — handle Firestore timestamp, ISO string, or Date
    let createdAt;
    try {
      createdAt = data.createdAt?._seconds
        ? new Date(data.createdAt._seconds * 1000)
        : new Date(data.createdAt);
      if (isNaN(createdAt.getTime())) createdAt = new Date();
    } catch {
      createdAt = new Date();
    }
    const dateStr = createdAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('SOILSENSE', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Soil Fertility Assessment Report', margin, 19);
    doc.setFontSize(8);
    doc.text(`${data.assessmentId || ''}  -  ${dateStr}`, pageWidth - margin, 19, { align: 'right' });

    y = 35;

    // ── Assessment Info ────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Assessment Information', margin, y);
    y += 6;

    const gps = (loc.latitude != null && loc.longitude != null)
      ? `${fmtNum(loc.latitude, 5)}, ${fmtNum(loc.longitude, 5)}`
      : 'Not available';

    y = runAutoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold' },
      body: [
        ['Assessment ID',  data.assessmentId || '—'],
        ['Farmer',         data.farmerName   || '—'],
        ['Date',           dateStr],
        ['Barangay',       loc.barangay      || '—'],
        ['Municipality',   loc.municipality  || 'Roxas'],
        ['Province',       loc.province      || 'Oriental Mindoro'],
        ['GPS Coordinates', gps],
      ],
    }) + 8;

    if (uploadedImage) {
      const imageScale = Math.min(75 / uploadedImage.width, 55 / uploadedImage.height);
      const imageWidth = uploadedImage.width * imageScale;
      const imageHeight = uploadedImage.height * imageScale;
      if (y > pageHeight - imageHeight - 55) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text('Uploaded Soil Photo', margin, y);
      y += 4;
      doc.addImage(uploadedImage.dataUrl, 'JPEG', margin, y, imageWidth, imageHeight);
      y += imageHeight + 6;
    }

    // ── Fertility Result ───────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Soil Fertility Result', margin, y);
    y += 6;

    const fertColor = getFertilityColor(f.fertilityClass);
    doc.setFillColor(...fertColor);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(f.fertilityClass || 'UNKNOWN').toUpperCase(), margin + 8, y + 8);
    doc.setFontSize(11);
    doc.text(`Score: ${f.fertilityScore ?? '—'} / 100`, margin + 8, y + 15);
    doc.setFontSize(10);
    doc.text(`Confidence: ${f.confidence ?? '—'}%  (${f.confidenceLevel || '—'})`,
      pageWidth - margin - 8, y + 11, { align: 'right' });

    y += 28;

    // ── Measurements ──────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Key Measurements', margin, y);
    y += 6;

    y = runAutoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      head: [['Parameter', 'Value', 'Fuzzy Set', 'Source']],
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255] },
      body: [
        ['Soil pH',       phVal != null ? fmtNum(phVal, 1) : '—',       (f.phFuzzySet || '—').replace(/_/g, ' '),       sensor.available ? 'ESP32 Sensor' : 'Manual / —'],
        ['Soil Moisture', moistureVal != null ? `${fmtNum(moistureVal, 0)}%` : '—', (f.moistureFuzzySet || '—').replace(/_/g, ' '), sensor.available ? 'ESP32 Sensor' : 'Manual / —'],
        ['Image Quality', img.imageQuality || '—',                      img.qualityScore != null ? `${(img.qualityScore * 100).toFixed(0)}%` : '—', 'Image Processing'],
      ],
    }) + 8;

    // ── Fuzzy Logic ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Fuzzy Logic Analysis', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const expLines = doc.splitTextToSize(f.explanation || 'No explanation available.', pageWidth - margin * 2);
    doc.text(expLines, margin, y);
    y += expLines.length * 4.5 + 5;

    // ── Fertilizer Recommendation ─────────────────────────────────────────────
    const fertilizer = data.aiFertilizerRecommendation || data.fertilizerRecommendationData;
    if (fertilizer) {
      if (y > pageHeight - 40) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(
        fertilizer.kind === 'gemini_ai'
          ? 'Gemini AI Fertilizer Recommendation'
          : 'Fertilizer Recommendation',
        margin,
        y
      );
      y += 6;

      const fertilizerCrop = (data.rootcropResults || data.cropRecommendations || [])
        .find(crop => crop.cropId === data.fertilizerRecommendationCropId);
      if (fertilizerCrop?.cropName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.text(`Based on ${f.fertilityClass || 'assessed'} soil fertility and ${fertilizerCrop.cropName}.`, margin, y);
        y += 5;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      const recommendationLines = [
        fertilizer.summary,
        fertilizer.fertilizerGuidance && `Fertilizer guidance: ${fertilizer.fertilizerGuidance}`,
        ...(fertilizer.recommendedActions || []).map(action => `Recommended: ${action}`),
        ...(fertilizer.avoidActions || []).map(action => `Avoid: ${action}`),
        ...(fertilizer.limitations || []).map(limitation => `Limitation: ${limitation}`),
        fertilizer.retestRecommendation,
        fertilizer.source,
        fertilizer.kind === 'gemini_ai'
          ? `Generated by ${fertilizer.provider || 'Google Gemini'}${fertilizer.model ? ` (${fertilizer.model})` : ''}.`
          : `Provided by ${fertilizer.provider || 'SoilSense assessment guidance'}.`,
        'Decision-support guidance only, not a laboratory fertilizer prescription.',
      ].filter(Boolean);

      for (const line of recommendationLines) {
        const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
        if (y + wrapped.length * 4.5 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5 + 2;
      }
    } else {
      if (y > pageHeight - 40) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text('Fertilizer Recommendation', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      const message = data.serviceStatus?.fertilizerRecommendation?.message ||
        'No fertilizer recommendation is available for this assessment.';
      const wrapped = doc.splitTextToSize(message, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 4;
    }

    // ── Crop Results ──────────────────────────────────────────────────────────
    if (crops.length > 0) {
      if (y > pageHeight - 60) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text('Crop Suitability Ranking', margin, y);
      y += 6;

      y = runAutoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        head: [['Rank', 'Crop', 'Local Name', 'Score', 'Status']],
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255] },
        body: crops.map(c => [
          c.rank ?? '—',
          c.cropName || '—',
          c.localName || '—',
          c.suitabilityScore != null ? `${fmtNum(c.suitabilityScore, 0)}%` : '—',
          (c.status || '—').replace(/_/g, ' '),
        ]),
      }) + 8;
    }

    // ── Limitations ───────────────────────────────────────────────────────────
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('System Limitations', margin, y);
    y += 6;

    const limitations = [
      '- Soil color is influenced by lighting conditions. Image features are indirect indicators only.',
      '- Without pH and moisture sensors, assessment confidence is limited.',
      '- Recommendations should be validated by laboratory analysis before high-value decisions.',
      '- Consult a qualified agricultural extension officer for official planting guidance.',
      '- SoilSense serves Roxas, Oriental Mindoro only.',
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    limitations.forEach(line => {
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.5;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('SoilSense - Preliminary assessment only. Does not replace laboratory soil analysis.',
        margin, pageHeight - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    // ── Save ────────────────────────────────────────────────────────────────
    doc.save(`SoilSense_Assessment_${data.assessmentId || 'Report'}.pdf`);
  } catch (err) {
    // Surface the real error to the console for debugging
    console.error('[reportGenerator] PDF generation failed:', err);
    throw err;
  }
}

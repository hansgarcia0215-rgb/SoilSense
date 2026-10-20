/**
 * assessmentId.js — Generate unique assessment IDs
 *
 * Produces IDs in the format: SS-2026-0042
 * Format: SS-{YEAR}-{ZERO_PADDED_SEQUENCE}
 *
 * The sequence is determined by the current assessment count in Firestore.
 * This keeps IDs human-readable and sortable by year.
 */

const { db } = require('../firebase/admin');

/**
 * Generate the next assessment ID.
 * Uses a Firestore counter document to ensure uniqueness.
 *
 * @returns {Promise<string>} e.g. "SS-2026-0001"
 */
async function generateAssessmentId() {
  const year = new Date().getFullYear();
  const counterRef = db.collection('system_settings').doc(`counter_${year}`);

  // Firestore transaction ensures no two assessments get the same number
  const newCount = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    const current = doc.exists ? (doc.data().count || 0) : 0;
    const next = current + 1;
    transaction.set(counterRef, {
      count: next,
      year,
      updatedAt: new Date(),
    });
    return next;
  });

  // Zero-pad to 4 digits: 1 → "0001", 999 → "0999"
  const padded = String(newCount).padStart(4, '0');
  return `SS-${year}-${padded}`;
}

module.exports = { generateAssessmentId };

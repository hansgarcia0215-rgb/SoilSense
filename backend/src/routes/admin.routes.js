/**
 * admin.routes.js — Admin management endpoints
 *
 * Routes:
 *   GET    /api/admin/crops           → List all crops
 *   POST   /api/admin/crops           → Create crop
 *   PUT    /api/admin/crops/:id       → Update crop
 *   DELETE /api/admin/crops/:id       → Delete crop
 *
 *   GET    /api/admin/fuzzy-rules     → List all fuzzy rules
 *   POST   /api/admin/fuzzy-rules     → Create rule
 *   PUT    /api/admin/fuzzy-rules/:id → Update rule
 *   DELETE /api/admin/fuzzy-rules/:id → Delete rule
 *
 *   GET    /api/admin/users           → List all users
 *   PUT    /api/admin/users/:id       → Update user role / active status
 *   DELETE /api/admin/users/:id       → Deactivate user
 */

const express = require('express');
const router  = express.Router();
const { db }  = require('../firebase/admin');
const { authenticate }  = require('../middleware/auth.middleware');
const { requireRole }   = require('../middleware/role.middleware');

// All admin routes require login + researcher or admin role
router.use(authenticate);
router.use(requireRole(['researcher', 'admin']));

// ─── CROPS ───────────────────────────────────────────────────

router.get('/crops', async (req, res, next) => {
  try {
    const snap = await db.collection('crops').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/crops', async (req, res, next) => {
  try {
    const crop = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.uid,
    };
    const ref = await db.collection('crops').add(crop);
    res.status(201).json({ success: true, id: ref.id, data: crop });
  } catch (err) { next(err); }
});

router.put('/crops/:id', async (req, res, next) => {
  try {
    const update = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    await db.collection('crops').doc(req.params.id).update(update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/crops/:id', async (req, res, next) => {
  try {
    await db.collection('crops').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── FUZZY RULES ─────────────────────────────────────────────

router.get('/fuzzy-rules', async (req, res, next) => {
  try {
    const snap = await db.collection('fuzzy_rules').get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by ruleId
    data.sort((a, b) => (a.ruleId || '').localeCompare(b.ruleId || ''));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/fuzzy-rules', async (req, res, next) => {
  try {
    const rule = {
      ...req.body,
      isActive:  true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.uid,
    };
    const ref = await db.collection('fuzzy_rules').add(rule);
    res.status(201).json({ success: true, id: ref.id, data: rule });
  } catch (err) { next(err); }
});

router.put('/fuzzy-rules/:id', async (req, res, next) => {
  try {
    const update = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    await db.collection('fuzzy_rules').doc(req.params.id).update(update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/fuzzy-rules/:id', async (req, res, next) => {
  try {
    await db.collection('fuzzy_rules').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── USERS ───────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const snap = await db.collection('users').get();
    const data = snap.docs.map(d => {
      const { passwordHash, ...safe } = d.data();
      return { id: d.id, ...safe };
    });
    data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    // Only allow updating role and isActive — never passwordHash
    const { role, isActive, barangay, municipality } = req.body;
    const update = { updatedAt: new Date() };
    if (role      !== undefined) update.role      = role;
    if (isActive  !== undefined) update.isActive  = isActive;
    if (barangay  !== undefined) update.barangay  = barangay;
    if (municipality !== undefined) update.municipality = municipality;
    await db.collection('users').doc(req.params.id).update(update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

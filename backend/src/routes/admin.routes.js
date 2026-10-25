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
 *   POST   /api/admin/users           → Create user (staff or farmer)
 *   PUT    /api/admin/users/:id       → Activate or deactivate a user account
 *   DELETE /api/admin/users/:id       → Permanently delete user
 */

const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const { admin, db }  = require('../firebase/admin');
const { authenticate }  = require('../middleware/auth.middleware');
const { requireRole }   = require('../middleware/role.middleware');
const { validate }      = require('../middleware/validate.middleware');
const { createError }   = require('../utils/errorHandler');

const MANAGEABLE_ROLES = ['farmer', 'extension_worker', 'admin'];
const ADMIN_UID = process.env.ADMIN_UID?.trim();

// All admin routes require login + system administrator role
router.use(authenticate);
router.use(requireRole(['admin']));

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
      const role = safe.role === 'researcher' || (ADMIN_UID && safe.uid === ADMIN_UID)
        ? 'admin'
        : safe.role;
      return { id: d.id, ...safe, role, isActive: safe.isActive !== false };
    });
    data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/users',
  [
    body('displayName').trim().notEmpty().withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
    body('role').isIn(MANAGEABLE_ROLES).withMessage('Invalid role.'),
    body('barangay').trim().notEmpty().withMessage('Barangay is required.'),
  ],
  validate,
  async (req, res, next) => {
    let firebaseUser;
    try {
      const { displayName, email, password, role, barangay, municipality } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existingQuery = await db.collection('users')
        .where('email', '==', normalizedEmail).limit(1).get();

      if (!existingQuery.empty) {
        return next(createError(409, 'EMAIL_EXISTS',
          'This email address is already registered.'));
      }

      firebaseUser = await admin.auth().createUser({
        displayName: displayName.trim(),
        email: normalizedEmail,
        password,
        disabled: false,
      });

      const newUser = {
        uid: firebaseUser.uid,
        displayName: displayName.trim(),
        email: normalizedEmail,
        role,
        barangay: barangay || '',
        municipality: municipality || 'Roxas',
        province: 'Oriental Mindoro',
        isActive: true,
        createdBy: req.user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userRef = db.collection('users').doc(firebaseUser.uid);
      await userRef.set(newUser);
      res.status(201).json({ success: true, data: newUser });
    } catch (err) {
      if (firebaseUser) {
        try {
          await admin.auth().deleteUser(firebaseUser.uid);
        } catch (cleanupError) {
          console.error('[Admin] Could not remove Firebase user after profile creation failed:', cleanupError.message);
        }
      }
      if (err.code === 'auth/email-already-exists') {
        return next(createError(409, 'EMAIL_EXISTS',
          'This email address is already registered.'));
      }
      next(err);
    }
  });

router.put('/users/:id',
  [
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const fields = Object.keys(req.body);
      if (fields.length !== 1 || fields[0] !== 'isActive') {
        return next(createError(400, 'INVALID_USER_UPDATE',
          'Only account status can be changed here.'));
      }

      const docRef = db.collection('users').doc(req.params.id);
      const doc    = await docRef.get();
      if (!doc.exists) {
        return next(createError(404, 'USER_NOT_FOUND', 'User not found.'));
      }

      const isActive = req.body.isActive === true || req.body.isActive === 'true';

      // Guard: never deactivate yourself
      if (doc.data().uid === req.user.uid || req.params.id === req.user.uid) {
        if (!isActive) {
          return next(createError(400, 'SELF_MODIFICATION',
            'You cannot deactivate your own account.'));
        }
      }

      await docRef.update({ isActive, updatedAt: new Date() });
      const uid = doc.data().uid || req.params.id;
      try {
        await admin.auth().updateUser(uid, { disabled: !isActive });
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }
      res.json({ success: true });
    } catch (err) { next(err); }
  });

router.delete('/users/:id', async (req, res, next) => {
  try {
    const docRef = db.collection('users').doc(req.params.id);
    const doc    = await docRef.get();
    if (!doc.exists) {
      return next(createError(404, 'USER_NOT_FOUND', 'User not found.'));
    }
    if (doc.data().uid === req.user.uid || req.params.id === req.user.uid) {
      return next(createError(400, 'SELF_DELETION',
        'You cannot delete your own account.'));
    }
    const uid = doc.data().uid || req.params.id;
    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        return next(err);
      }
    }

    await docRef.delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

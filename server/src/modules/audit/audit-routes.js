// /server/src/modules/audit/audit-routes.js
import express from 'express';
import { db } from '../../data/db.js';
import { addAuditEntry } from './audit-store.js';
import { HttpError } from '../../utils/httpError.js';
import { authRequired } from '../../middleware/authRequired.js';

const router = express.Router();

/**
 * POST /audit { actor?, action, entity, entityId, ts? }
 * TMA-45
 */
router.post('/audit', authRequired, (req, res, next) => {
  const { action, entity, entityId, ts } = req.body;

  if (!action || !entity || !entityId) {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'action, entity and entityId are required'
      )
    );
  }

  const actor =
    req.body.actor || (req.user && req.user.email) || 'anonymous';

  const entry = addAuditEntry({ actor, action, entity, entityId, ts });
  res.status(201).json(entry);
});

/**
 * GET /audit?entity=&entityId=
 * TMA-46
 */
router.get('/audit', authRequired, (req, res) => {
  const { entity, entityId } = req.query;

  let result = db.audit;

  if (entity) {
    result = result.filter(e => e.entity === entity);
  }
  if (entityId) {
    result = result.filter(e => e.entityId === entityId);
  }

  res.json(result);
});

export default router;

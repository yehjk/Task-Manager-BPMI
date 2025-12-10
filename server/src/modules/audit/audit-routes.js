// Audit routes
// Provides endpoints for writing and reading audit log entries.

import express from "express";
import { addAuditEntry } from "./audit-store.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";
import { AuditEntry } from "../../db/models/AuditEntry.js";

const router = express.Router();

// POST /audit
// Creates a new audit entry.
router.post("/audit", authRequired, async (req, res, next) => {
  try {
    const { action, entity, entityId, ts } = req.body;

    if (!action || !entity || !entityId) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "action, entity and entityId are required"
        )
      );
    }

    const actor =
      req.body.actor || req.user?.email || "anonymous";

    const entry = await addAuditEntry({
      actor,
      action,
      entity,
      entityId,
      ts,
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// GET /audit
// Returns audit entries filtered by entity or entityId.
router.get("/audit", authRequired, async (req, res, next) => {
  try {
    const { entity, entityId } = req.query;

    const filter = {};
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;

    const result = await AuditEntry.find(filter).lean();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

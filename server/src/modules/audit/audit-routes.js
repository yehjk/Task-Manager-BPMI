// /server/src/modules/audit/audit-routes.js
import express from "express";
import { addAuditEntry } from "./audit-store.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";
import { AuditEntry } from "../../db/models/AuditEntry.js";

const router = express.Router();

router.post("/audit", authRequired, async (req, res, next) => {
  try {
    const { action, entity, entityId, ts, boardId, details } = req.body;

    if (!action || !entity || !entityId) {
      return next(new HttpError(400, "VALIDATION_ERROR", "action, entity and entityId are required"));
    }

    const actor = req.user?.email || "anonymous";

    const entry = await addAuditEntry({
      actor,
      action,
      entity,
      entityId,
      ts,
      boardId,
      details,
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.get("/audit", authRequired, async (req, res, next) => {
  try {
    const { entity, entityId, boardId } = req.query;

    const filter = {};
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;
    if (boardId) filter.boardId = boardId;

    const result = await AuditEntry.find(filter).sort({ ts: -1 }).lean();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

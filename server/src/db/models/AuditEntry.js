// /server/src/db/models/AuditEntry.js
import mongoose from "mongoose";

const AuditEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  boardId: { type: String, default: null, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  ts: { type: String, required: true },
});

export const AuditEntry = mongoose.model("AuditEntry", AuditEntrySchema);

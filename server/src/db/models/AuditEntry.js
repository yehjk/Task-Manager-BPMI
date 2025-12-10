// AuditEntry model
// Stores immutable audit log records describing changes made in the system.

import mongoose from "mongoose";

const AuditEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },       // UUID of the audit entry
  actor: { type: String, required: true },                  // User who performed the action
  action: { type: String, required: true },                 // Action name (e.g., TASK_CREATED)
  entity: { type: String, required: true },                 // Entity type (task, ticket, board…)
  entityId: { type: String, required: true },               // Target entity ID
  ts: { type: String, required: true },                     // Timestamp ISO string
});

export const AuditEntry = mongoose.model("AuditEntry", AuditEntrySchema);

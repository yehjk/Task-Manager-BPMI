// Audit store
// Provides a helper to create and persist audit log entries.

import { v4 as uuidv4 } from "uuid";
import { AuditEntry } from "../../db/models/AuditEntry.js";

export async function addAuditEntry({
  actor,
  action,
  entity,
  entityId,
  ts,
}) {
  const entry = new AuditEntry({
    id: uuidv4(),
    actor,
    action,
    entity,
    entityId,
    ts: ts || new Date().toISOString(),
  });

  await entry.save();
  return entry;
}

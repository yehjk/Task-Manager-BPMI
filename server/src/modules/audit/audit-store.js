// /server/src/modules/audit/audit-store.js
import { v4 as uuidv4 } from "uuid";
import { AuditEntry } from "../../db/models/AuditEntry.js";

export async function addAuditEntry({ actor, action, entity, entityId, ts, boardId, details }) {
  const entry = new AuditEntry({
    id: uuidv4(),
    actor,
    action,
    entity,
    entityId,
    boardId: boardId || null,
    details: details ?? null,
    ts: ts || new Date().toISOString(),
  });

  await entry.save();
  return entry;
}

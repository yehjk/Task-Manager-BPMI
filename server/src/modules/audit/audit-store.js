// /server/src/modules/audit/audit-store.js
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/db.js';

export function addAuditEntry({ actor, action, entity, entityId, ts }) {
  const entry = {
    id: uuidv4(),
    actor,
    action,
    entity,
    entityId,
    ts: ts || new Date().toISOString()
  };
  db.audit.push(entry);
  return entry;
}

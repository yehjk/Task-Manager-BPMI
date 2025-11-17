// /server/src/data/db.js
import { v4 as uuidv4 } from 'uuid';

const demoBoardId = 'demo-board';

export const db = {
  boards: [
    {
      id: demoBoardId,
      name: 'Demo Board',
      labels: [
        { id: uuidv4(), name: 'Bug', color: '#ef4444' },
        { id: uuidv4(), name: 'Feature', color: '#22c55e' }
      ],
      columns: [
        { id: uuidv4(), title: 'Backlog', position: 1 },
        { id: uuidv4(), title: 'In Progress', position: 2 },
        { id: uuidv4(), title: 'Done', position: 3 }
      ],
      tasks: [] // { id, title, columnId, position }
    }
  ],
  audit: [] // { id, actor, action, entity, entityId, ts }
};

export const DEMO_BOARD_ID = demoBoardId;

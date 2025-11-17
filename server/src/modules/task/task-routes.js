// /server/src/modules/task/task-routes.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/db.js';
import { HttpError } from '../../utils/httpError.js';
import { authRequired } from '../../middleware/authRequired.js';
import { addAuditEntry } from '../audit/audit-store.js';

const router = express.Router();

function findBoard(boardId) {
  const board = db.boards.find(b => b.id === boardId);
  if (!board) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }
  return board;
}

function normalizePositions(board, columnId) {
  const tasksInColumn = board.tasks
    .filter(t => t.columnId === columnId)
    .sort((a, b) => a.position - b.position);

  tasksInColumn.forEach((t, idx) => {
    t.position = idx + 1;
  });
}

/**
 * GET /boards/:id/columns
 * TMA-10
 */
router.get('/boards/:id/columns', authRequired, (req, res) => {
  const board = findBoard(req.params.id);
  res.json(board.columns);
});

/**
 * POST /columns { boardId, title, position }
 * TMA-11
 */
router.post('/columns', authRequired, (req, res, next) => {
  const { boardId, title, position } = req.body;

  if (!title || typeof position !== 'number') {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'title and numeric position are required'
      )
    );
  }

  const board = findBoard(boardId || db.boards[0].id);

  const column = {
    id: uuidv4(),
    title: title.trim(),
    position
  };

  board.columns.push(column);
  board.columns.sort((a, b) => a.position - b.position);

  res.status(201).json(column);
});

/**
 * PATCH /tasks/:id { title }
 * Update task title
 */
router.patch('/tasks/:id', authRequired, (req, res, next) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'title is required and cannot be empty'
      )
    );
  }

  let board = null;
  let task = null;

  // find board that contains this task
  for (const b of db.boards) {
    const t = b.tasks.find(x => x.id === req.params.id);
    if (t) {
      board = b;
      task = t;
      break;
    }
  }

  if (!task || !board) {
    return next(new HttpError(404, 'TASK_NOT_FOUND', 'Task not found'));
  }

  task.title = title.trim();

  // audit
  addAuditEntry({
    actor: req.user?.email || 'anonymous',
    action: 'TASK_UPDATED',
    entity: 'task',
    entityId: task.id
  });

  res.json(task);
});

/**
 * DELETE /columns/:id
 * TMA-15 (часть)
 */
router.delete('/columns/:id', authRequired, (req, res, next) => {
  const columnId = req.params.id;

  // ищем, на какой доске эта колонка
  const board = db.boards.find(b =>
    b.columns.some(c => c.id === columnId)
  );
  if (!board) {
    return next(new HttpError(404, 'COLUMN_NOT_FOUND', 'Column not found'));
  }

  board.columns = board.columns.filter(c => c.id !== columnId);
  // удаляем задачи в этой колонке
  board.tasks = board.tasks.filter(t => t.columnId !== columnId);

  res.status(204).send();
});

/**
 * GET /boards/:id/tasks
 * TMA-12
 */
router.get('/boards/:id/tasks', authRequired, (req, res) => {
  const board = findBoard(req.params.id);
  res.json(board.tasks);
});

/**
 * POST /boards/:id/tasks { title, columnId }
 * TMA-13
 */
router.post('/boards/:id/tasks', authRequired, (req, res, next) => {
  const board = findBoard(req.params.id);
  const { title, columnId } = req.body;

  if (!title || !columnId) {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'title and columnId are required'
      )
    );
  }

  const column = board.columns.find(c => c.id === columnId);
  if (!column) {
    return next(
      new HttpError(400, 'VALIDATION_ERROR', 'Invalid columnId')
    );
  }

  const nextPos =
    board.tasks.filter(t => t.columnId === columnId).length + 1;

  const task = {
    id: uuidv4(),
    title: title.trim(),
    columnId,
    position: nextPos
  };

  board.tasks.push(task);

  // audit
  addAuditEntry({
    actor: req.user?.email || 'anonymous',
    action: 'TASK_CREATED',
    entity: 'task',
    entityId: task.id
  });

  res.status(201).json(task);
});

/**
 * PATCH /tasks/:id/move { columnId, position }
 * TMA-14 + TMA-17
 */
router.patch('/tasks/:id/move', authRequired, (req, res, next) => {
  const { columnId, position } = req.body;

  // находим доску и задачу
  let board = null;
  let task = null;

  for (const b of db.boards) {
    const t = b.tasks.find(x => x.id === req.params.id);
    if (t) {
      board = b;
      task = t;
      break;
    }
  }

  if (!task || !board) {
    return next(new HttpError(404, 'TASK_NOT_FOUND', 'Task not found'));
  }

  const targetColumnId = columnId || task.columnId;
  const targetColumn = board.columns.find(c => c.id === targetColumnId);

  if (!targetColumn) {
    return next(
      new HttpError(400, 'VALIDATION_ERROR', 'Invalid target columnId')
    );
  }

  // удаляем из старой колонки и нормализуем
  const oldColumnId = task.columnId;
  board.tasks = board.tasks.filter(t => t.id !== task.id);
  normalizePositions(board, oldColumnId);

  // задачи в новой колонке
  const tasksInNewColumn = board.tasks
    .filter(t => t.columnId === targetColumnId)
    .sort((a, b) => a.position - b.position);

  const insertPos = Math.max(
    1,
    Math.min(
      position || tasksInNewColumn.length + 1,
      tasksInNewColumn.length + 1
    )
  );

  tasksInNewColumn.splice(insertPos - 1, 0, task);
  task.columnId = targetColumnId;

  tasksInNewColumn.forEach((t, idx) => {
    t.position = idx + 1;
  });

  const otherTasks = board.tasks.filter(
    t => t.columnId !== targetColumnId
  );
  board.tasks = otherTasks.concat(tasksInNewColumn);

  addAuditEntry({
    actor: req.user?.email || 'anonymous',
    action: 'TASK_MOVED',
    entity: 'task',
    entityId: task.id
  });

  res.json(task);
});

/**
 * DELETE /tasks/:id
 * TMA-15 (вторая часть)
 */
router.delete('/tasks/:id', authRequired, (req, res, next) => {
  let board = null;
  let task = null;

  for (const b of db.boards) {
    const t = b.tasks.find(x => x.id === req.params.id);
    if (t) {
      board = b;
      task = t;
      break;
    }
  }

  if (!task || !board) {
    return next(new HttpError(404, 'TASK_NOT_FOUND', 'Task not found'));
  }

  const columnId = task.columnId;
  board.tasks = board.tasks.filter(t => t.id !== task.id);
  normalizePositions(board, columnId);

  res.status(204).send();
});

export default router;

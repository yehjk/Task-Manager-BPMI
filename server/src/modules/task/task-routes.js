// /server/src/modules/task/task-routes.js
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Board } from "../../db/models/Board.js";
import { Task } from "../../db/models/Task.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";
import { addAuditEntry } from "../audit/audit-store.js";

const router = express.Router();

function emailLowerFromReq(req) {
  const email = String(req.user?.email || "").trim();
  return email ? email.toLowerCase() : "";
}

function ensureAuthEmail(req) {
  const email = String(req.user?.email || "").trim();
  const emailLower = emailLowerFromReq(req);
  if (!emailLower) throw new HttpError(401, "AUTH_REQUIRED", "Email missing in token");
  return { email, emailLower };
}

async function findBoard(boardId) {
  const board = await Board.findOne({ id: boardId });
  if (!board) throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found");
  return board;
}

async function findBoardByColumnId(columnId) {
  const board = await Board.findOne({ "columns.id": columnId });
  if (!board) throw new HttpError(404, "COLUMN_NOT_FOUND", "Column not found");
  return board;
}

function isOwner(board, emailLower) {
  return (board.ownerEmailLower || "").toLowerCase() === emailLower;
}

function getMember(board, emailLower) {
  return (board.members || []).find((m) => (m.emailLower || "").toLowerCase() === emailLower) || null;
}

function hasAnyAccess(board, emailLower) {
  return isOwner(board, emailLower) || !!getMember(board, emailLower);
}

function requireBoardAccess(board, emailLower) {
  if (!hasAnyAccess(board, emailLower)) {
    throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found");
  }
}

function requireOwner(board, emailLower) {
  if (!isOwner(board, emailLower)) {
    throw new HttpError(403, "FORBIDDEN", "Only owner can perform this action");
  }
}

function normalizeDueDate(raw) {
  // undefined
  if (raw === undefined) return undefined;

  // null
  if (raw === null || raw === "") return null;

  const s = String(raw).trim();
  if (!s) return null;

  // expecting YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new HttpError(400, "VALIDATION_ERROR", "dueDate must be in YYYY-MM-DD format");
  }

  // checking real date
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "dueDate is invalid");
  }

  const [yy, mm, dd] = s.split("-").map((x) => Number(x));
  if (d.getFullYear() !== yy || d.getMonth() + 1 !== mm || d.getDate() !== dd) {
    throw new HttpError(400, "VALIDATION_ERROR", "dueDate is invalid");
  }

  return s;
}

async function normalizePositions(boardId, columnId) {
  const tasks = await Task.find({ boardId, columnId }).sort("position");
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].position !== i + 1) {
      tasks[i].position = i + 1;
      await tasks[i].save();
    }
  }
}

router.get("/boards/:id/columns", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);
    requireBoardAccess(board, emailLower);
    res.json(board.columns || []);
  } catch (err) {
    next(err);
  }
});

router.post("/columns", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const { boardId, title, isDone } = req.body;

    if (!boardId) return next(new HttpError(400, "VALIDATION_ERROR", "boardId is required"));
    if (!title || !String(title).trim()) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Column title is required"));
    }

    const board = await findBoard(boardId);
    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const currentColumns = board.columns || [];
    const position = currentColumns.length + 1;

    const column = {
      id: uuidv4(),
      title: String(title).trim(),
      position,
      isDone: typeof isDone === "boolean" ? isDone : false,
    };

    board.columns.push(column);
    board.columns.sort((a, b) => a.position - b.position);
    await board.save();

    await addAuditEntry({
      actor: email,
      action: "COLUMN_CREATED",
      entity: "column",
      entityId: column.id,
      boardId: board.id,
      details: { title: column.title, position: column.position, isDone: column.isDone },
    });

    res.status(201).json(column);
  } catch (err) {
    next(err);
  }
});

router.patch("/columns/:id", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const columnId = req.params.id;
    const { title, position, isDone } = req.body;

    const board = await findBoardByColumnId(columnId);
    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const columns = board.columns || [];
    const idx = columns.findIndex((c) => c.id === columnId);
    if (idx === -1) return next(new HttpError(404, "COLUMN_NOT_FOUND", "Column not found"));

    const column = columns[idx];
    const before = { title: column.title, position: column.position, isDone: !!column.isDone };

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) return next(new HttpError(400, "VALIDATION_ERROR", "Column title cannot be empty"));
      column.title = trimmed;
    }

    if (typeof isDone === "boolean") column.isDone = isDone;

    if (position !== undefined) {
      if (typeof position !== "number" || !Number.isFinite(position)) {
        return next(new HttpError(400, "VALIDATION_ERROR", "position must be a number"));
      }

      const targetPos = Math.max(1, Math.min(Math.round(position), columns.length));
      const [removed] = columns.splice(idx, 1);
      columns.splice(targetPos - 1, 0, removed);
      columns.forEach((c, i) => (c.position = i + 1));
    }

    await board.save();

    const updated = (board.columns || []).find((c) => c.id === columnId);

    await addAuditEntry({
      actor: email,
      action: "COLUMN_UPDATED",
      entity: "column",
      entityId: columnId,
      boardId: board.id,
      details: { before, after: { title: updated.title, position: updated.position, isDone: !!updated.isDone } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/columns/:id", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const columnId = req.params.id;
    const board = await findBoardByColumnId(columnId);
    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const col = (board.columns || []).find((c) => c.id === columnId);

    board.columns = (board.columns || []).filter((c) => c.id !== columnId);
    await board.save();

    await Task.deleteMany({ boardId: board.id, columnId });

    await addAuditEntry({
      actor: email,
      action: "COLUMN_DELETED",
      entity: "column",
      entityId: columnId,
      boardId: board.id,
      details: { title: col?.title || null },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/boards/:id/tasks", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);
    requireBoardAccess(board, emailLower);

    const tasks = await Task.find({ boardId: board.id }).sort("position").lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post("/boards/:id/tasks", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const board = await findBoard(req.params.id);
    requireBoardAccess(board, emailLower);

    const { title, columnId, description, assigneeId, dueDate } = req.body;
    if (!title || !columnId) {
      return next(new HttpError(400, "VALIDATION_ERROR", "title and columnId are required"));
    }

    const column = (board.columns || []).find((c) => c.id === columnId);
    if (!column) return next(new HttpError(400, "VALIDATION_ERROR", "Invalid columnId"));

    const dueDateNorm = normalizeDueDate(dueDate);

    const nextPos = (await Task.countDocuments({ boardId: board.id, columnId })) + 1;

    const task = new Task({
      id: uuidv4(),
      boardId: board.id,
      title: String(title).trim(),
      columnId,
      position: nextPos,
      description: description == null ? "" : String(description),
      assigneeId: assigneeId == null || assigneeId === "" ? null : String(assigneeId),
      dueDate: dueDateNorm === undefined ? null : dueDateNorm,
    });

    await task.save();

    await addAuditEntry({
      actor: email,
      action: "TASK_CREATED",
      entity: "task",
      entityId: task.id,
      boardId: board.id,
      details: { columnId, position: task.position, title: task.title, dueDate: task.dueDate },
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.get("/tickets/:id", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);

    const task = await Task.findOne({ id: req.params.id }).lean();
    if (!task) return next(new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found"));

    const board = await findBoard(task.boardId);
    requireBoardAccess(board, emailLower);

    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/tasks/:id", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const { title, description, assigneeId, dueDate } = req.body;

    if (title === undefined || title === null || !String(title).trim()) {
      return next(new HttpError(400, "VALIDATION_ERROR", "title is required and cannot be empty"));
    }

    const task = await Task.findOne({ id: req.params.id });
    if (!task) return next(new HttpError(404, "TASK_NOT_FOUND", "Task not found"));

    const board = await findBoard(task.boardId);
    requireBoardAccess(board, emailLower);

    const before = {
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
    };

    task.title = String(title).trim();
    if (description !== undefined) task.description = description == null ? "" : String(description);
    if (assigneeId !== undefined) task.assigneeId = assigneeId == null || assigneeId === "" ? null : String(assigneeId);

    const dueDateNorm = normalizeDueDate(dueDate);
    if (dueDateNorm !== undefined) {
      task.dueDate = dueDateNorm;
    }

    await task.save();

    await addAuditEntry({
      actor: email,
      action: "TASK_UPDATED",
      entity: "task",
      entityId: task.id,
      boardId: task.boardId,
      details: {
        before,
        after: {
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          dueDate: task.dueDate,
        },
      },
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/tasks/:id/move", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const { columnId, position } = req.body;

    const task = await Task.findOne({ id: req.params.id });
    if (!task) return next(new HttpError(404, "TASK_NOT_FOUND", "Task not found"));

    const board = await findBoard(task.boardId);
    requireBoardAccess(board, emailLower);

    const from = { columnId: task.columnId, position: task.position };

    const targetColumnId = columnId || task.columnId;
    const targetColumn = (board.columns || []).find((c) => c.id === targetColumnId);
    if (!targetColumn) return next(new HttpError(400, "VALIDATION_ERROR", "Invalid target columnId"));

    const oldColumnId = task.columnId;

    const tasksInNewColumn = await Task.find({
      boardId: task.boardId,
      columnId: targetColumnId,
      id: { $ne: task.id },
    }).sort("position");

    const insertPosRaw = position || tasksInNewColumn.length + 1;
    const insertPos = Math.max(1, Math.min(insertPosRaw, tasksInNewColumn.length + 1));

    tasksInNewColumn.splice(insertPos - 1, 0, task);
    task.columnId = targetColumnId;

    for (let i = 0; i < tasksInNewColumn.length; i++) {
      tasksInNewColumn[i].position = i + 1;
      await tasksInNewColumn[i].save();
    }

    if (oldColumnId !== targetColumnId) {
      await normalizePositions(task.boardId, oldColumnId);
    }

    const to = { columnId: task.columnId, position: task.position };

    await addAuditEntry({
      actor: email,
      action: "TASK_MOVED",
      entity: "task",
      entityId: task.id,
      boardId: task.boardId,
      details: { from, to },
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/tasks/:id", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const task = await Task.findOne({ id: req.params.id });
    if (!task) return next(new HttpError(404, "TASK_NOT_FOUND", "Task not found"));

    const board = await findBoard(task.boardId);
    requireBoardAccess(board, emailLower);

    const snapshot = {
      boardId: task.boardId,
      columnId: task.columnId,
      position: task.position,
      title: task.title,
      dueDate: task.dueDate,
    };

    await Task.deleteOne({ id: task.id });
    await normalizePositions(snapshot.boardId, snapshot.columnId);

    await addAuditEntry({
      actor: email,
      action: "TASK_DELETED",
      entity: "task",
      entityId: task.id,
      boardId: snapshot.boardId,
      details: snapshot,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

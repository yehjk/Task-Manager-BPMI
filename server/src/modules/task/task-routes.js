// Task & column routes
// Provides CRUD operations for columns and tasks, including drag & drop moves
// and ticket-style fields (description, assigneeId).

import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Board } from "../../db/models/Board.js";
import { Task } from "../../db/models/Task.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";
import { addAuditEntry } from "../audit/audit-store.js";

const router = express.Router();

// Helper: fetch board by id or throw 404
async function findBoard(boardId) {
  const board = await Board.findOne({ id: boardId });
  if (!board) {
    throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found");
  }
  return board;
}

// Helper: fetch board containing a given column or throw 404
async function findBoardByColumnId(columnId) {
  const board = await Board.findOne({ "columns.id": columnId });
  if (!board) {
    throw new HttpError(404, "COLUMN_NOT_FOUND", "Column not found");
  }
  return board;
}

// Helper: normalize task positions in a column to 1..N
async function normalizePositions(boardId, columnId) {
  const tasks = await Task.find({ boardId, columnId }).sort("position");
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].position !== i + 1) {
      tasks[i].position = i + 1;
      await tasks[i].save();
    }
  }
}

// GET /boards/:id/columns
// Returns all columns of a board.
router.get("/boards/:id/columns", authRequired, async (req, res, next) => {
  try {
    const board = await findBoard(req.params.id);
    res.json(board.columns || []);
  } catch (err) {
    next(err);
  }
});

// POST /columns { boardId, title }
// Creates a new column at the end of the board.
router.post("/columns", authRequired, async (req, res, next) => {
  try {
    const { boardId, title } = req.body;

    if (!title || !title.trim()) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Column title is required")
      );
    }

    const board =
      boardId != null ? await findBoard(boardId) : await Board.findOne();

    if (!board) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Board not found"));
    }

    const currentColumns = board.columns || [];
    const position = currentColumns.length + 1;

    const column = {
      id: uuidv4(),
      title: title.trim(),
      position,
    };

    board.columns.push(column);
    board.columns.sort((a, b) => a.position - b.position);
    await board.save();

    res.status(201).json(column);
  } catch (err) {
    next(err);
  }
});

// PATCH /columns/:id { title?, position? }
// Renames a column and/or changes its position within the board.
router.patch("/columns/:id", authRequired, async (req, res, next) => {
  try {
    const columnId = req.params.id;
    const { title, position } = req.body;

    const board = await findBoardByColumnId(columnId);
    const columns = board.columns || [];
    const idx = columns.findIndex((c) => c.id === columnId);

    if (idx === -1) {
      return next(
        new HttpError(404, "COLUMN_NOT_FOUND", "Column not found")
      );
    }

    const column = columns[idx];

    // Rename
    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) {
        return next(
          new HttpError(
            400,
            "VALIDATION_ERROR",
            "Column title cannot be empty"
          )
        );
      }
      column.title = trimmed;
    }

    // Reorder
    if (position !== undefined) {
      if (typeof position !== "number" || !Number.isFinite(position)) {
        return next(
          new HttpError(400, "VALIDATION_ERROR", "position must be a number")
        );
      }

      const targetPos = Math.max(
        1,
        Math.min(Math.round(position), columns.length)
      );

      const [removed] = columns.splice(idx, 1);
      columns.splice(targetPos - 1, 0, removed);

      columns.forEach((c, i) => {
        c.position = i + 1;
      });
    }

    await board.save();

    const updated = (board.columns || []).find((c) => c.id === columnId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id
// Required: title. Optional: description, assigneeId.
router.patch("/tasks/:id", authRequired, async (req, res, next) => {
  try {
    const { title, description, assigneeId } = req.body;

    // title is required and must be non-empty
    if (title === undefined || title === null || !String(title).trim()) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "title is required and cannot be empty"
        )
      );
    }

    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return next(new HttpError(404, "TASK_NOT_FOUND", "Task not found"));
    }

    // title
    task.title = String(title).trim();

    // description: optional, can be empty string
    if (description !== undefined) {
      task.description =
        description === null || description === undefined
          ? ""
          : String(description);
    }

    // assigneeId: optional, string or null
    if (assigneeId !== undefined) {
      task.assigneeId =
        assigneeId === null || assigneeId === ""
          ? null
          : String(assigneeId);
    }

    await task.save();

    await addAuditEntry({
      actor: req.user?.email || "anonymous",
      action: "TASK_UPDATED",
      entity: "task",
      entityId: task.id,
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /columns/:id
// Deletes a column and all tasks inside it.
router.delete("/columns/:id", authRequired, async (req, res, next) => {
  try {
    const columnId = req.params.id;

    const board = await findBoardByColumnId(columnId);

    board.columns = (board.columns || []).filter((c) => c.id !== columnId);
    await board.save();

    await Task.deleteMany({ boardId: board.id, columnId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /boards/:id/tasks
// Returns tasks for a board ordered by position.
router.get("/boards/:id/tasks", authRequired, async (req, res, next) => {
  try {
    const tasks = await Task.find({ boardId: req.params.id })
      .sort("position")
      .lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /boards/:id/tasks
// Creates a new task in a column.
// Required: title, columnId. Optional: description, assigneeId.
router.post("/boards/:id/tasks", authRequired, async (req, res, next) => {
  try {
    const board = await findBoard(req.params.id);
    const { title, columnId, description, assigneeId } = req.body;

    if (!title || !columnId) {
      return next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "title and columnId are required"
        )
      );
    }

    const column = (board.columns || []).find((c) => c.id === columnId);
    if (!column) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Invalid columnId")
      );
    }

    const nextPos =
      (await Task.countDocuments({
        boardId: board.id,
        columnId,
      })) + 1;

    const task = new Task({
      id: uuidv4(),
      boardId: board.id,
      title: title.trim(),
      columnId,
      position: nextPos,
      description:
        description === undefined || description === null
          ? ""
          : String(description),
      assigneeId:
        assigneeId === undefined || assigneeId === null || assigneeId === ""
          ? null
          : String(assigneeId),
    });

    await task.save();

    const actor = req.user?.email || "anonymous";

    await addAuditEntry({
      actor,
      action: "TASK_CREATED",
      entity: "task",
      entityId: task.id,
    });

    await addAuditEntry({
      actor,
      action: "TICKET_CREATED",
      entity: "ticket",
      entityId: task.id,
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// GET /tickets/:id
// Returns a full ticket (task) by id.
router.get("/tickets/:id", authRequired, async (req, res, next) => {
  try {
    const task = await Task.findOne({ id: req.params.id }).lean();
    if (!task) {
      return next(
        new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found")
      );
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /tickets/:id
// Updates ticket fields: title, description, assigneeId (all optional).
router.patch("/tickets/:id", authRequired, async (req, res, next) => {
  try {
    const { title, description, assigneeId } = req.body;

    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return next(
        new HttpError(404, "TICKET_NOT_FOUND", "Ticket not found")
      );
    }

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) {
        return next(
          new HttpError(
            400,
            "VALIDATION_ERROR",
            "title cannot be empty"
          )
        );
      }
      task.title = trimmed;
    }

    if (description !== undefined) {
      task.description =
        description === null || description === undefined
          ? ""
          : String(description);
    }

    if (assigneeId !== undefined) {
      task.assigneeId =
        assigneeId === null || assigneeId === "" ? null : String(assigneeId);
    }

    await task.save();

    const actor = req.user?.email || "anonymous";

    await addAuditEntry({
      actor,
      action: "TICKET_UPDATED",
      entity: "ticket",
      entityId: task.id,
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id/move { columnId, position }
// Moves a task to another column and/or position and normalizes positions.
router.patch("/tasks/:id/move", authRequired, async (req, res, next) => {
  try {
    const { columnId, position } = req.body;

    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return next(new HttpError(404, "TASK_NOT_FOUND", "Task not found"));
    }

    const board = await findBoard(task.boardId);

    const targetColumnId = columnId || task.columnId;
    const targetColumn = (board.columns || []).find(
      (c) => c.id === targetColumnId
    );

    if (!targetColumn) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Invalid target columnId")
      );
    }

    const oldColumnId = task.columnId;

    const tasksInNewColumn = await Task.find({
      boardId: task.boardId,
      columnId: targetColumnId,
      id: { $ne: task.id },
    }).sort("position");

    const insertPosRaw = position || tasksInNewColumn.length + 1;
    const insertPos = Math.max(
      1,
      Math.min(insertPosRaw, tasksInNewColumn.length + 1)
    );

    tasksInNewColumn.splice(insertPos - 1, 0, task);
    task.columnId = targetColumnId;

    for (let i = 0; i < tasksInNewColumn.length; i++) {
      tasksInNewColumn[i].position = i + 1;
      await tasksInNewColumn[i].save();
    }

    if (oldColumnId !== targetColumnId) {
      await normalizePositions(task.boardId, oldColumnId);
    }

    await addAuditEntry({
      actor: req.user?.email || "anonymous",
      action: "TASK_MOVED",
      entity: "task",
      entityId: task.id,
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id
// Deletes a task and normalizes positions in its column.
router.delete("/tasks/:id", authRequired, async (req, res, next) => {
  try {
    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return next(
        new HttpError(404, "TASK_NOT_FOUND", "Task not found")
      );
    }

    const { boardId, columnId } = task;

    await Task.deleteOne({ id: task.id });
    await normalizePositions(boardId, columnId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

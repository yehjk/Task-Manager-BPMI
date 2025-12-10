// Board routes
// Provides CRUD operations for boards, and management of board-level labels.

import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Board } from "../../db/models/Board.js";
import { Task } from "../../db/models/Task.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";

const router = express.Router();

// Helper: fetch board or throw 404
async function findBoard(boardId) {
  const board = await Board.findOne({ id: boardId });
  if (!board) {
    throw new HttpError(404, "BOARD_NOT_FOUND", "Board not found");
  }
  return board;
}

// GET /boards
// Returns all boards.
router.get("/boards", authRequired, async (_req, res, next) => {
  try {
    const boards = await Board.find().lean();
    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// POST /boards { name }
// Creates a new board.
router.post("/boards", authRequired, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Board name is required")
      );
    }

    const ownerEmail = req.user?.email || null;

    const board = new Board({
      id: uuidv4(),
      name: name.trim(),
      labels: [],
      columns: [],
      ownerEmail,
    });

    await board.save();
    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// PATCH /boards/:id { name }
// Updates board properties (currently only name).
router.patch("/boards/:id", authRequired, async (req, res, next) => {
  try {
    const board = await findBoard(req.params.id);
    const { name } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(
          new HttpError(400, "VALIDATION_ERROR", "Board name cannot be empty")
        );
      }
      board.name = name.trim();
    }

    await board.save();
    res.json(board);
  } catch (err) {
    next(err);
  }
});

// DELETE /boards/:id
// Deletes a board and all its tasks.
router.delete("/boards/:id", authRequired, async (req, res, next) => {
  try {
    const boardId = req.params.id;

    const result = await Board.deleteOne({ id: boardId });
    if (result.deletedCount === 0) {
      return next(new HttpError(404, "BOARD_NOT_FOUND", "Board not found"));
    }

    // Remove associated tasks
    await Task.deleteMany({ boardId });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /boards/:id/labels
// Returns board-level labels.
router.get("/boards/:id/labels", authRequired, async (req, res, next) => {
  try {
    const board = await findBoard(req.params.id);
    res.json(board.labels || []);
  } catch (err) {
    next(err);
  }
});

// POST /boards/:id/labels { name }
// Creates a new label for a board.
router.post("/boards/:id/labels", authRequired, async (req, res, next) => {
  try {
    const board = await findBoard(req.params.id);
    const { name } = req.body;

    if (!name || !name.trim()) {
      return next(
        new HttpError(400, "VALIDATION_ERROR", "Label name is required")
      );
    }

    const label = {
      id: uuidv4(),
      name: name.trim(),
    };

    board.labels.push(label);
    await board.save();

    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
});

// PATCH /boards/:id/labels/:labelId { name }
// Updates a label on a board.
router.patch(
  "/boards/:id/labels/:labelId",
  authRequired,
  async (req, res, next) => {
    try {
      const board = await findBoard(req.params.id);
      const label = (board.labels || []).find(
        (l) => l.id === req.params.labelId
      );

      if (!label) {
        return next(
          new HttpError(404, "LABEL_NOT_FOUND", "Label not found")
        );
      }

      const { name } = req.body;

      if (name !== undefined) {
        if (!name || !name.trim()) {
          return next(
            new HttpError(
              400,
              "VALIDATION_ERROR",
              "Label name cannot be empty"
            )
          );
        }
        label.name = name.trim();
      }

      await board.save();
      res.json(label);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /boards/:id/labels/:labelId
// Removes a label from a board.
router.delete(
  "/boards/:id/labels/:labelId",
  authRequired,
  async (req, res, next) => {
    try {
      const board = await findBoard(req.params.id);

      const index = (board.labels || []).findIndex(
        (l) => l.id === req.params.labelId
      );

      if (index === -1) {
        return next(
          new HttpError(404, "LABEL_NOT_FOUND", "Label not found")
        );
      }

      board.labels.splice(index, 1);
      await board.save();

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;

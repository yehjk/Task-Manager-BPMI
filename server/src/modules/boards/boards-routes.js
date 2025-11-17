// /server/src/modules/boards/boards-routes.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../data/db.js';
import { HttpError } from '../../utils/httpError.js';
import { authRequired } from '../../middleware/authRequired.js';

const router = express.Router();

function findBoard(boardId) {
  const board = db.boards.find(b => b.id === boardId);
  if (!board) {
    throw new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found');
  }
  return board;
}

/**
 * GET /boards
 * TMA-3
 */
router.get('/boards', authRequired, (_req, res) => {
  res.json(db.boards);
});

/**
 * POST /boards { name }
 * TMA-4
 */
router.post('/boards', authRequired, (req, res, next) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return next(
      new HttpError(400, 'VALIDATION_ERROR', 'Board name is required')
    );
  }

  const board = {
    id: uuidv4(),
    name: name.trim(),
    labels: [],
    columns: [],
    tasks: []
  };

  db.boards.push(board);
  res.status(201).json(board);
});

/**
 * PATCH /boards/:id { name }
 * TMA-5
 */
router.patch('/boards/:id', authRequired, (req, res, next) => {
  const board = findBoard(req.params.id);
  const { name } = req.body;

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return next(
        new HttpError(400, 'VALIDATION_ERROR', 'Board name cannot be empty')
      );
    }
    board.name = name.trim();
  }

  res.json(board);
});

/**
 * DELETE /boards/:id
 * TMA-6
 */
router.delete('/boards/:id', authRequired, (req, res, next) => {
  const index = db.boards.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return next(new HttpError(404, 'BOARD_NOT_FOUND', 'Board not found'));
  }
  db.boards.splice(index, 1);
  res.status(204).send();
});

/**
 * GET /boards/:id/labels
 * TMA-7
 */
router.get('/boards/:id/labels', authRequired, (req, res) => {
  const board = findBoard(req.params.id);
  res.json(board.labels);
});

/**
 * POST /boards/:id/labels { name, color }
 * TMA-7 + TMA-8 (color unique)
 */
router.post('/boards/:id/labels', authRequired, (req, res, next) => {
  const board = findBoard(req.params.id);
  const { name, color } = req.body;

  if (!name || !name.trim() || !color) {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'Label name and color are required'
      )
    );
  }

  const colorTaken = board.labels.some(l => l.color === color);
  if (colorTaken) {
    return next(
      new HttpError(
        400,
        'VALIDATION_ERROR',
        'Label color must be unique within board'
      )
    );
  }

  const label = {
    id: uuidv4(),
    name: name.trim(),
    color
  };

  board.labels.push(label);
  res.status(201).json(label);
});

/**
 * PATCH /boards/:id/labels/:labelId { name?, color? }
 */
router.patch(
  '/boards/:id/labels/:labelId',
  authRequired,
  (req, res, next) => {
    const board = findBoard(req.params.id);
    const label = board.labels.find(l => l.id === req.params.labelId);

    if (!label) {
      return next(
        new HttpError(404, 'LABEL_NOT_FOUND', 'Label not found')
      );
    }

    const { name, color } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(
          new HttpError(
            400,
            'VALIDATION_ERROR',
            'Label name cannot be empty'
          )
        );
      }
      label.name = name.trim();
    }

    if (color !== undefined) {
      const colorTaken = board.labels.some(
        l => l.color === color && l.id !== label.id
      );
      if (colorTaken) {
        return next(
          new HttpError(
            400,
            'VALIDATION_ERROR',
            'Label color must be unique within board'
          )
        );
      }
      label.color = color;
    }

    res.json(label);
  }
);

/**
 * DELETE /boards/:id/labels/:labelId
 */
router.delete(
  '/boards/:id/labels/:labelId',
  authRequired,
  (req, res, next) => {
    const board = findBoard(req.params.id);
    const index = board.labels.findIndex(l => l.id === req.params.labelId);

    if (index === -1) {
      return next(
        new HttpError(404, 'LABEL_NOT_FOUND', 'Label not found')
      );
    }

    board.labels.splice(index, 1);
    res.status(204).send();
  }
);

export default router;

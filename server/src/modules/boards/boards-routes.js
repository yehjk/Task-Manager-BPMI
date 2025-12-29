// /server/src/modules/boards/boards-routes.js
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Board } from "../../db/models/Board.js";
import { Task } from "../../db/models/Task.js";
import { BoardInvite } from "../../db/models/BoardInvite.js";
import { User } from "../../db/models/User.js";
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

async function computeBoardStats(board) {
  const membersCount = (board.members || []).length;

  const doneColumnIds = new Set((board.columns || []).filter((c) => !!c.isDone).map((c) => c.id));

  const tasksCount = await Task.countDocuments({ boardId: board.id });

  let doneCount = 0;
  if (doneColumnIds.size > 0) {
    doneCount = await Task.countDocuments({
      boardId: board.id,
      columnId: { $in: Array.from(doneColumnIds) },
    });
  }

  const lastTask = await Task.findOne({ boardId: board.id }).sort({ updatedAt: -1 }).lean();
  const lastActivityAt = lastTask?.updatedAt
    ? new Date(lastTask.updatedAt).toISOString()
    : board.updatedAt
      ? new Date(board.updatedAt).toISOString()
      : null;

  return { membersCount, tasksCount, doneCount, lastActivityAt };
}

router.get("/boards", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);

    const boards = await Board.find({
      $or: [{ ownerEmailLower: emailLower }, { "members.emailLower": emailLower }],
    }).lean();

    const enriched = [];
    for (const b of boards) {
      const stats = await computeBoardStats(b);
      enriched.push({
        ...b,
        membersCount: stats.membersCount,
        tasksCount: stats.tasksCount,
        doneCount: stats.doneCount,
        lastActivityAt: stats.lastActivityAt,
      });
    }

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

router.post("/boards", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Board name is required"));
    }

    const board = new Board({
      id: uuidv4(),
      name: String(name).trim(),
      labels: [],
      columns: [],
      ownerEmail: email,
      ownerEmailLower: emailLower,
      members: [],
    });

    await board.save();

    await addAuditEntry({
      actor: email,
      action: "BOARD_CREATED",
      entity: "board",
      entityId: board.id,
      boardId: board.id,
      details: { name: board.name },
    });

    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

router.patch("/boards/:id", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const { name } = req.body;
    if (name !== undefined) {
      if (!name || !String(name).trim()) {
        return next(new HttpError(400, "VALIDATION_ERROR", "Board name cannot be empty"));
      }
      const before = board.name;
      board.name = String(name).trim();
      await board.save();

      await addAuditEntry({
        actor: email,
        action: "BOARD_UPDATED",
        entity: "board",
        entityId: board.id,
        boardId: board.id,
        details: { before: { name: before }, after: { name: board.name } },
      });
    }

    res.json(board);
  } catch (err) {
    next(err);
  }
});

router.delete("/boards/:id", authRequired, async (req, res, next) => {
  try {
    const { emailLower, email } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    await Board.deleteOne({ id: board.id });
    await Task.deleteMany({ boardId: board.id });
    await BoardInvite.deleteMany({ boardId: board.id });

    await addAuditEntry({
      actor: email,
      action: "BOARD_DELETED",
      entity: "board",
      entityId: board.id,
      boardId: board.id,
      details: { name: board.name },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/boards/:id/labels", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);
    requireBoardAccess(board, emailLower);
    res.json(board.labels || []);
  } catch (err) {
    next(err);
  }
});

router.post("/boards/:id/labels", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Label name is required"));
    }

    const label = { id: uuidv4(), name: String(name).trim() };
    board.labels.push(label);
    await board.save();

    await addAuditEntry({
      actor: email,
      action: "LABEL_CREATED",
      entity: "label",
      entityId: label.id,
      boardId: board.id,
      details: { name: label.name },
    });

    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
});

router.patch("/boards/:id/labels/:labelId", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const label = (board.labels || []).find((l) => l.id === req.params.labelId);
    if (!label) return next(new HttpError(404, "LABEL_NOT_FOUND", "Label not found"));

    const before = { name: label.name };

    const { name } = req.body;
    if (name !== undefined) {
      if (!name || !String(name).trim()) {
        return next(new HttpError(400, "VALIDATION_ERROR", "Label name cannot be empty"));
      }
      label.name = String(name).trim();
    }

    await board.save();

    await addAuditEntry({
      actor: email,
      action: "LABEL_UPDATED",
      entity: "label",
      entityId: label.id,
      boardId: board.id,
      details: { before, after: { name: label.name } },
    });

    res.json(label);
  } catch (err) {
    next(err);
  }
});

router.get("/boards/:id/members", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);
    requireBoardAccess(board, emailLower);

    let owner = null;
    if (board.ownerEmailLower) {
      const u = await User.findOne({ emailLower: board.ownerEmailLower }).lean();
      if (u) {
        owner = { name: u.name || "", email: u.email, emailLower: u.emailLower };
      }
    }

    if (!owner) {
      owner = {
        name: "",
        email: board.ownerEmail || "",
        emailLower: board.ownerEmailLower || "",
      };
    }

    res.json({ owner, members: board.members || [] });
  } catch (err) {
    next(err);
  }
});

router.delete("/boards/:id/members/:emailLower", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const targetLower = String(req.params.emailLower || "").toLowerCase().trim();
    if (!targetLower) return next(new HttpError(400, "VALIDATION_ERROR", "emailLower is required"));

    if ((board.ownerEmailLower || "").toLowerCase() === targetLower) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Cannot remove owner"));
    }

    const beforeCount = (board.members || []).length;
    const exists = (board.members || []).some((m) => (m.emailLower || "").toLowerCase() === targetLower);
    if (!exists) {
      return next(new HttpError(404, "MEMBER_NOT_FOUND", "Member not found"));
    }

    board.members = (board.members || []).filter((m) => (m.emailLower || "").toLowerCase() !== targetLower);
    await board.save();

    await BoardInvite.updateMany(
      { boardId: board.id, emailLower: targetLower, status: "pending" },
      { $set: { status: "revoked", revokedAt: new Date() } }
    );

    await addAuditEntry({
      actor: email,
      action: "BOARD_MEMBER_REMOVED",
      entity: "boardMember",
      entityId: `${board.id}:${targetLower}`,
      boardId: board.id,
      details: { emailLower: targetLower, beforeCount, afterCount: (board.members || []).length },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/boards/:id/invites", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);
    const board = await findBoard(req.params.id);

    requireBoardAccess(board, emailLower);
    requireOwner(board, emailLower);

    const inviteEmail = String(req.body?.email || "").trim();
    const inviteEmailLower = inviteEmail.toLowerCase();

    if (!inviteEmailLower || !inviteEmail.includes("@")) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Valid email is required"));
    }

    const targetUser = await User.findOne({ emailLower: inviteEmailLower }).lean();
    if (!targetUser) {
      return next(new HttpError(404, "USER_NOT_FOUND", "No such user registered"));
    }

    if (hasAnyAccess(board, inviteEmailLower)) {
      return next(new HttpError(409, "ALREADY_MEMBER", "User already has access to this board"));
    }

    const existing = await BoardInvite.findOne({
      boardId: board.id,
      emailLower: inviteEmailLower,
      status: "pending",
    });
    if (existing) {
      return next(new HttpError(409, "INVITE_ALREADY_SENT", "Pending invite already exists"));
    }

    const invite = new BoardInvite({
      id: uuidv4(),
      boardId: board.id,
      email: inviteEmail,
      emailLower: inviteEmailLower,
      role: "member",
      invitedByEmail: email,
      invitedByEmailLower: emailLower,
      status: "pending",
      acceptedAt: null,
      revokedAt: null,
    });

    await invite.save();

    await addAuditEntry({
      actor: email,
      action: "BOARD_INVITE_CREATED",
      entity: "boardInvite",
      entityId: invite.id,
      boardId: board.id,
      details: { email: inviteEmail, role: "member" },
    });

    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
});

router.get("/invites", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);

    const type = String(req.query?.type || "incoming");
    const status = String(req.query?.status || "pending");

    const filter = {};
    if (type === "outgoing") {
      filter.invitedByEmailLower = emailLower;
    } else {
      filter.emailLower = emailLower;
    }

    if (status !== "all") filter.status = status;

    const invites = await BoardInvite.find(filter).sort({ createdAt: -1 }).lean();
    res.json(invites);
  } catch (err) {
    next(err);
  }
});

router.post("/invites/:inviteId/accept", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const invite = await BoardInvite.findOne({ id: req.params.inviteId });
    if (!invite || invite.status !== "pending") {
      return next(new HttpError(404, "INVITE_NOT_FOUND", "Invite not found"));
    }
    if ((invite.emailLower || "").toLowerCase() !== emailLower) {
      return next(new HttpError(403, "FORBIDDEN", "Invite does not belong to this user"));
    }

    const board = await findBoard(invite.boardId);

    if (hasAnyAccess(board, emailLower)) {
      invite.status = "accepted";
      invite.acceptedAt = invite.acceptedAt || new Date();
      await invite.save();
      return res.json({ ok: true, boardId: board.id });
    }

    board.members = board.members || [];
    board.members.push({ email, emailLower, role: "member", joinedAt: new Date() });
    await board.save();

    invite.status = "accepted";
    invite.acceptedAt = new Date();
    await invite.save();

    await addAuditEntry({
      actor: email,
      action: "BOARD_INVITE_ACCEPTED",
      entity: "boardInvite",
      entityId: invite.id,
      boardId: board.id,
      details: { email: invite.email, role: "member" },
    });

    res.json({ ok: true, boardId: board.id });
  } catch (err) {
    next(err);
  }
});

router.post("/invites/:inviteId/revoke", authRequired, async (req, res, next) => {
  try {
    const { email, emailLower } = ensureAuthEmail(req);

    const invite = await BoardInvite.findOne({ id: req.params.inviteId });
    if (!invite || invite.status !== "pending") {
      return next(new HttpError(404, "INVITE_NOT_FOUND", "Invite not found"));
    }

    const board = await findBoard(invite.boardId);
    const can =
      (invite.invitedByEmailLower || "").toLowerCase() === emailLower ||
      (board.ownerEmailLower || "").toLowerCase() === emailLower;

    if (!can) return next(new HttpError(403, "FORBIDDEN", "Not allowed to revoke this invite"));

    invite.status = "revoked";
    invite.revokedAt = new Date();
    await invite.save();

    await addAuditEntry({
      actor: email,
      action: "BOARD_INVITE_REVOKED",
      entity: "boardInvite",
      entityId: invite.id,
      boardId: board.id,
      details: { email: invite.email },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/boards/:id", authRequired, async (req, res, next) => {
  try {
    const { emailLower } = ensureAuthEmail(req);

    const board = await Board.findOne({ id: req.params.id }).lean();
    if (!board) return next(new HttpError(404, "BOARD_NOT_FOUND", "Board not found"));

    requireBoardAccess(board, emailLower);

    res.json(board);
  } catch (err) {
    next(err);
  }
});

export default router;

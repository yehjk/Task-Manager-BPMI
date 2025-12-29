// /server/src/db/models/BoardInvite.js
import mongoose from "mongoose";

const BoardInviteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    boardId: { type: String, required: true, index: true },

    email: { type: String, required: true },
    emailLower: { type: String, required: true, index: true },

    role: { type: String, required: true, enum: ["member"], default: "member" },

    invitedByEmail: { type: String, required: true },
    invitedByEmailLower: { type: String, required: true },

    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "revoked"],
      default: "pending",
    },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const BoardInvite = mongoose.model("BoardInvite", BoardInviteSchema);

// /server/src/db/models/Board.js
import mongoose from "mongoose";

const LabelSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const ColumnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    position: { type: Number, required: true },
    isDone: { type: Boolean, default: false },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    emailLower: { type: String, required: true },
    role: { type: String, required: true, enum: ["member"], default: "member" },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const BoardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },

    labels: { type: [LabelSchema], default: [] },
    columns: { type: [ColumnSchema], default: [] },

    ownerEmail: { type: String, default: null },
    ownerEmailLower: { type: String, default: null, index: true },

    members: { type: [MemberSchema], default: [] },
  },
  { timestamps: true }
);

export const Board = mongoose.model("Board", BoardSchema);

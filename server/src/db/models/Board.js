// Board model
// Represents a Kanban board containing labels and columns.
// The board also stores the owner's email (from JWT).

import mongoose from "mongoose";

const LabelSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },   // UUID
    name: { type: String, required: true }, // Label text
  },
  { _id: false }
);

const ColumnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },       // UUID
    title: { type: String, required: true },    // Column title
    position: { type: Number, required: true }, // Ordering index
  },
  { _id: false }
);

const BoardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // UUID
    name: { type: String, required: true },             // Board title

    labels: { type: [LabelSchema], default: [] },       // Board-level labels
    columns: { type: [ColumnSchema], default: [] },     // Column definitions

    ownerEmail: { type: String, default: null },        // Board owner (from JWT)
  },
  {
    timestamps: true, // Automatically generates createdAt & updatedAt
  }
);

export const Board = mongoose.model("Board", BoardSchema);

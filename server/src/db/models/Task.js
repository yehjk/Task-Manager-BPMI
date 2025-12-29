// /server/src/db/models/Task.js
import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    boardId: { type: String, required: true },
    columnId: { type: String, required: true },

    position: { type: Number, required: true },
    title: { type: String, required: true },

    description: { type: String, default: "" },
    assigneeId: { type: String, default: null },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", TaskSchema);

// Task model
// Represents a task inside a board column. Includes basic ticket fields
// such as description and assignee.

import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },  // UUID
  boardId: { type: String, required: true },           // Parent board ID
  columnId: { type: String, required: true },          // Column containing the task

  position: { type: Number, required: true },          // Ordering index
  title: { type: String, required: true },             // Task title

  description: { type: String, default: "" },          // Long text description
  assigneeId: { type: String, default: null },         // Assigned user (email or ID)
});

export const Task = mongoose.model("Task", TaskSchema);

// /server/src/db/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, required: true },
    emailLower: { type: String, required: true, unique: true, index: true },

    authProvider: { type: String, required: true, enum: ["local", "google"] },
    providerId: { type: String, default: null },

    passwordHash: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);

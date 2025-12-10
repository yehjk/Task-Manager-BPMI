// MongoDB connection helper
// Initializes a Mongoose connection and terminates the process on failure.

import mongoose from "mongoose";

export async function connectMongo() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tma_demo2";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log("Connected to MongoDB:", uri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Stop the server if the DB is unavailable
  }
}

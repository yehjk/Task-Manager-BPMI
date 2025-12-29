// /server/src/db/mongo.js
import mongoose from "mongoose";

export async function connectMongo() {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tma";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log("Connected to MongoDB:");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// /server/src/db/mongo.js
import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    console.log("Connected to MongoDB:", uri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    await mongoose.connect("mongodb://localhost:27017/chatApp");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
};

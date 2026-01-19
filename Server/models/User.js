const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // ===== Auth =====
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    default: "",
  },

  // ===== Profile =====
  avatar: {
    type: String,
    default: "",
  },
  displayName: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "Online",
  },

  // ===== Presence (CÁI BẠN HỎI) =====
  online: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: null,
  },

  // ===== System =====
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  provider: {
    type: String,
    enum: ["local", "google", "facebook"],
    default: "local",
  },
});

module.exports = mongoose.model("User", UserSchema);

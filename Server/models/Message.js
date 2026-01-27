const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Message",
  new mongoose.Schema({
    username: String,
    fromId: String,
    to: String,
    text: String,
    time: String,
    groupId: String,

    // ===== ADDED: SEEN =====
    seen: { type: Boolean, default: false }, // 1–1
    seenBy: { type: [String], default: [] }, // group

    timestamp: { type: Date, default: Date.now },
  })
);

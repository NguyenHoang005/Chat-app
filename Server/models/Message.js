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
    timestamp: { type: Date, default: Date.now },
  })
);

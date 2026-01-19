const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Group",
  new mongoose.Schema({
    name: String,
    members: [String],
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
  })
);

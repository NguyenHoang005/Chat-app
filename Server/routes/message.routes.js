const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

/**
 * GET /messages/:conversationId
 * Query:
 *  - user=<userId>
 *  - group=true (nếu là group chat)
 */
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { user: userId, group } = req.query;

  try {
    let messages;

    if (group === "true") {
      messages = await Message.find({ groupId: conversationId }).sort({
        timestamp: 1,
      });
    } else {
      messages = await Message.find({
        $or: [
          { fromId: userId, to: conversationId },
          { fromId: conversationId, to: userId },
        ],
      }).sort({ timestamp: 1 });
    }

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy tin nhắn." });
  }
});

module.exports = router;

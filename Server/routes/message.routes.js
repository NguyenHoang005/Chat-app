const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

/**
 * GET /messages/:conversationId
 * Query:
 *  - user=<userId>
 *  - group=true (nếu là group chat)
 */
router.get("/:conversationId", async (req, res) => {
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

// ✏️ EDIT MESSAGE
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { text, userId } = req.body;

  try {
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // chỉ cho sửa tin của chính mình
    if (String(msg.fromId) !== String(userId)) {
      return res.status(403).json({ message: "No permission" });
    }

    msg.text = text;
    await msg.save();

    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: "Edit message failed" });
  }
});

// 🗑 DELETE MESSAGE
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (String(msg.fromId) !== String(userId)) {
      return res.status(403).json({ message: "No permission" });
    }

    await msg.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete message failed" });
  }
});



module.exports = router;

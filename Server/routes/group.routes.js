const express = require("express");
const Group = require("../models/Group");

const router = express.Router();

/**
 * GET /groups
 * Lấy tất cả group
 */
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy groups." });
  }
});

/**
 * GET /groups/:userId
 * Lấy group theo userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy group." });
  }
});

/**
 * POST /groups
 * Tạo group
 */
router.post("/", async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;

    if (!name || !Array.isArray(members) || members.length === 0) {
      return res
        .status(400)
        .json({ message: "Tên nhóm hoặc thành viên không hợp lệ." });
    }

    const group = await Group.create({ name, members, createdBy });
    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi tạo group." });
  }
});

module.exports = router;

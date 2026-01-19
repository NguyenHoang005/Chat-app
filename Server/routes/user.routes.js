const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const uploadAvatar = require("../middlewares/uploadAvatar");

const router = express.Router();

/**
 * GET /api/users
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select(
      "_id username displayName avatar online lastSeen"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/users (test)
 */
router.post("/", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * PUT /api/users/:id
 */
router.put("/:id", async (req, res) => {
  const { displayName, bio, status } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { displayName, bio, status },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Cập nhật profile thất bại" });
  }
});

/**
 * POST /api/users/:id/avatar
 */
router.post(
  "/:id/avatar",
  uploadAvatar.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file" });
      }

      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { avatar: avatarPath },
        { new: true }
      ).select("-password");

      res.json({
        message: "Upload avatar thành công",
        avatar: avatarPath,
        user,
      });
    } catch (err) {
      res.status(500).json({ message: "Upload avatar thất bại" });
    }
  }
);

/**
 * PUT /api/users/:id/password
 */
router.put("/:id/password", async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User không tồn tại" });
  }

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) {
    return res.status(400).json({ message: "Mật khẩu cũ sai" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Đổi mật khẩu thành công" });
});

module.exports = router;

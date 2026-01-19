const express = require("express");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const passport = require("passport");
const User = require("../models/User");

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }

    const existed = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existed) {
      return res.status(400).json({ message: "User đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      displayName: username,
    });

    res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Register failed" });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Sai email hoặc mật khẩu" });
    }

    user.online = true;
    await user.save();

    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/**
 * GOOGLE OAUTH
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    res.redirect(
      `http://localhost:3000/oauth-success?user=${encodeURIComponent(
        JSON.stringify(req.user)
      )}`
    );
  }
);

module.exports = router;

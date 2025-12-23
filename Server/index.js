require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const validator = require("validator");
const FacebookStrategy = require("passport-facebook").Strategy;

// ===== Lấy IP LAN =====
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        !iface.address.startsWith("25.") &&
        !iface.address.startsWith("26.") &&
        !iface.address.startsWith("192.") // giữ nguyên như bạn yêu cầu
      ) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// ======= MongoDB =======
mongoose
  .connect("mongodb://localhost:27017/chatApp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connect error:", err));

// ======= Mongoose Models =======
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  })
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    username: String,
    fromId: String,
    to: String,
    text: String,
    time: String,
    timestamp: { type: Date, default: Date.now },
    groupId: { type: String, default: null },
  })
);

const Group = mongoose.model(
  "Group",
  new mongoose.Schema({
    name: String,
    members: [String],
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
  })
);

// ======= REST API =======

// Lấy danh sách user
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("_id username online lastSeen");
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// Tạo user thủ công
app.post("/users", async (req, res) => {
  try {
    res.status(201).json(await User.create(req.body));
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ======= Đăng ký =======
app.post("/register", async (req, res) => {
  let { username, email, password } = req.body;

  username = username?.trim();
  email = email?.trim();
  password = password?.trim();

  if (!username || username.length < 3 || username.length > 30) {
    return res.status(400).json({ message: "Tên người dùng phải từ 3 đến 30 ký tự." });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu phải ít nhất 6 ký tự." });
  }
  const strongPass =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
  if (!strongPass.test(password)) {
    return res.status(400).json({
      message: "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt.",
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      message: "Đăng ký thành công!",
      user: { _id: newUser._id, username: newUser.username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server khi đăng ký." });
  }
});

// ======= Login =======
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email không tồn tại." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng." });
    }

    return res.json({
      message: "Đăng nhập thành công!",
      user: { _id: user._id, username: user.username },
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server." });
  }
});

// ===== API lấy tất cả group =====
app.get("/groups", async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy groups." });
  }
});

// Lấy group theo userId
app.get("/groups/:userId", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy group." });
  }
});

// API gộp user + group
app.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find({ _id: { $ne: userId } })
      .select("_id username online lastSeen")
      .lean()
      .then((data) => data.map((u) => ({ ...u, type: "user" })));

    const groups = await Group.find({ members: userId })
      .lean()
      .then((data) =>
        data.map((g) => ({
          _id: g._id,
          username: g.name,
          members: g.members,
          createdBy: g.createdBy,
          createdAt: g.createdAt,
          type: "group",
        }))
      );

    res.json([...users, ...groups]);
  } catch (err) {
    console.error("Lỗi khi lấy conversations:", err);
    res.status(500).json({ message: "Lỗi server khi lấy conversations." });
  }
});

// Tạo group
app.post("/groups", async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;
    if (!name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Tên nhóm và thành viên không hợp lệ." });
    }

    const group = await Group.create({ name, members, createdBy });

    members.forEach((memberId) => {
      io.to(String(memberId)).emit("groupCreated", group);
    });

    res.status(201).json(group);
  } catch (err) {
    console.error("Lỗi khi tạo group:", err);
    res.status(500).json({ message: "Lỗi server khi tạo group." });
  }
});

// Lấy lịch sử tin nhắn
app.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { user: userId, group } = req.query;
  try {
    let msgs;
    if (group === "true") {
      msgs = await Message.find({ groupId: conversationId }).sort({ timestamp: 1 });
    } else {
      msgs = await Message.find({
        $or: [
          { fromId: userId, to: conversationId },
          { fromId: conversationId, to: userId },
        ],
      }).sort({ timestamp: 1 });
    }
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy tin nhắn." });
  }
});

// ===== Google OAuth =====
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      let user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = await User.create({
          username: profile.displayName,
          email: profile.emails[0].value,
          password: "",
        });
      }
      return done(null, user);
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    const userData = encodeURIComponent(JSON.stringify(req.user));
    res.redirect(`http://localhost:3000/oauth-success?user=${userData}`);
  }
);

// Facebook OAuth2
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/facebook/callback",
    profileFields: ["id", "displayName", "emails"]
  },
  async (accessToken, refreshToken, profile, done) => {
    let email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: profile.displayName,
        email,
        password: ""
      });
    }
    return done(null, user);
  }
));

app.get("/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get("/auth/facebook/callback",
  passport.authenticate("facebook", {session: false, failureRedirect: "/" }),
  (req, res) => {
    const userData = encodeURIComponent(JSON.stringify(req.user));
    res.redirect(`http://localhost:3000/oauth-success?user=${userData}`);
  }
);

// ======= HTTP + Socket.IO =======
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const onlineUsers = new Map();

async function saveMessage(doc) {
  return await Message.create(doc);
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query?.userId;
  console.log(`🔌 Client connected: ${socket.id} | userId: ${userId || "unknown"}`);

  if (userId) {
    socket.join(String(userId));
    const current = onlineUsers.get(userId) || new Set();
    current.add(socket.id);
    onlineUsers.set(userId, current);

    User.findByIdAndUpdate(userId, { online: true }, { new: true }).then((user) => {
      if (user) io.emit("userOnline", user._id);
    });
  }

  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`📢 User ${userId} joined group ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(groupId);
    console.log(`📢 User ${userId} left group ${groupId}`);
  });

  socket.on("chatMessage", async (msg) => {
    try {
      const doc = {
        username: msg.username || "Unknown",
        fromId: String(msg.fromId || "unknown"),
        to: String(msg.to || ""),
        text: msg.text,
        time:
          msg.time ||
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        groupId: msg.groupId || null,
      };

      const saved = await saveMessage(doc);

      if (msg.groupId) {
        io.to(msg.groupId).emit("chatMessage", saved);
      } else {
        io.to(String(saved.fromId)).emit("chatMessage", saved);
        io.to(String(saved.to)).emit("chatMessage", saved);
      }
    } catch (err) {
      console.error("Lỗi lưu message:", err);
      socket.emit("errorMessage", { message: "Không lưu được tin nhắn." });
    }
  });

  socket.on("disconnect", async () => {
    console.log(`❌ Client disconnected: ${socket.id} | userId: ${userId || "unknown"}`);

    if (userId) {
      const current = onlineUsers.get(userId) || new Set();
      current.delete(socket.id);
      if (current.size === 0) {
        onlineUsers.delete(userId);
        const lastSeenTime = new Date();
        await User.findByIdAndUpdate(userId, {
          online: false,
          lastSeen: lastSeenTime,
        });
        io.emit("userOffline", { userId, lastSeen: lastSeenTime });
      } else {
        onlineUsers.set(userId, current);
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const IP = getLocalIP();

server.listen(PORT, HOST, () => {
  console.log("🚀 Server & Socket.io đang chạy tại:");
  console.log(`   📡 Local:   http://localhost:${PORT}`);
  console.log(`🌍 Network: http://${IP}:${PORT}`);
});

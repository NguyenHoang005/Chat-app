require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const passport = require("passport");
const connectDB = require("./config/db");
const initPassport = require("./config/passport");
const { initSocket } = require("./socket");
const getLocalIP = require("./config/getLocalIP");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const groupRoutes = require("./routes/group.routes");
const messageRoutes = require("./routes/message.routes");

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

connectDB();
initPassport(passport);

/* =======================
   ROUTES 
======================= */
app.use("/api/auth", authRoutes);     // /api/auth/login, /api/auth/register
app.use("/api/users", userRoutes);    // /api/users
app.use("/api/groups", groupRoutes);  // /api/groups
app.use("/api/messages", messageRoutes); // /api/messages

/* =======================
   STATIC FILES
======================= */
app.use("/uploads", express.static("uploads"));

/* =======================
   SERVER + SOCKET
======================= */
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 8080;
const IP = getLocalIP();

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running:");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${IP}:${PORT}`);
});

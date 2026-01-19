const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

const onlineUsers = new Map();

module.exports.initSocket = function (server) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      socket.join(userId);
      User.findByIdAndUpdate(userId, { online: true }).then(() =>
        io.emit("userOnline", userId)
      );
    }

    socket.on("chatMessage", async (msg) => {
      const saved = await Message.create(msg);
      if (msg.groupId) io.to(msg.groupId).emit("chatMessage", saved);
      else {
        io.to(saved.fromId).emit("chatMessage", saved);
        io.to(saved.to).emit("chatMessage", saved);
      }
    });

    socket.on("disconnect", async () => {
      if (userId) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          online: false,
          lastSeen,
        });
        io.emit("userOffline", { userId, lastSeen });
      }
    });
  });
};

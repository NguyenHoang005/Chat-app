const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

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

    // ================= CHAT MESSAGE =================
    socket.on("chatMessage", async (msg) => {
      const saved = await Message.create(msg);

      if (msg.groupId) {
        io.to(msg.groupId).emit("chatMessage", saved);
      } else {
        io.to(saved.fromId).emit("chatMessage", saved);
        io.to(saved.to).emit("chatMessage", saved);
      }
    });

    // ================= TYPING =================
    socket.on("typing", ({ to, groupId, from }) => {
      if (groupId) {
        socket.to(groupId).emit("typing", { from, groupId });
      } else {
        io.to(to).emit("typing", { from });
      }
    });

    socket.on("stopTyping", ({ to, groupId, from }) => {
      if (groupId) {
        socket.to(groupId).emit("stopTyping", { from, groupId });
      } else {
        io.to(to).emit("stopTyping", { from });
      }
    });

    // ================= SEEN =================
    socket.on("seenMessage", async ({ messageId, userId, groupId }) => {
      if (groupId) {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { seenBy: userId },
        });
        io.to(groupId).emit("messageSeen", { messageId, userId });
      } else {
        await Message.findByIdAndUpdate(messageId, { seen: true });
        io.to(saved.fromId).emit("messageSeen", {
  messageId,
  from: saved.to,
});
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

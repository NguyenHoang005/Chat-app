import { useState, useEffect, useRef } from "react";
import "./Chat.css";
import {
  FaPhone,
  FaVideo,
  FaSearch,
  FaColumns,
  FaSmile,
  FaBell
} from "react-icons/fa";
import { MdSend } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";
import { io } from "socket.io-client";

const API_BASE = "http://10.24.42.16:8080";

// Hàm tính "Hoạt động X phút/giờ trước"
const timeAgo = (timestamp) => {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
};

const Chat = () => {
  const [message, setMessage] = useState("");
  const [chatWith, setChatWith] = useState(null);
  const [allMessages, setAllMessages] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // state cho tạo nhóm
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const rawUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentUserId = String(rawUser._id || rawUser.id || rawUser.username);
  const currentUsername =
    rawUser.username || rawUser.name || rawUser.email || "Bạn";

  // Hàm lấy danh sách user + nhóm
  const fetchConversations = async () => {
    try {
      // Gọi API users
      const usersRes = await fetch(`${API_BASE.replace(/\/$/, "")}/users`);
      if (!usersRes.ok) throw new Error(usersRes.statusText);
      const usersData = await usersRes.json();

      // Gọi API groups
      const groupsRes = await fetch(`${API_BASE.replace(/\/$/, "")}/groups`);
      if (!groupsRes.ok) throw new Error(groupsRes.statusText);
      const groupsData = await groupsRes.json();

      // Lọc user khác mình
      const userConvs = usersData
        .filter(
          (u) =>
            String(u._id || u.id || u.username) !== String(currentUserId)
        )
        .map((u, idx) => ({
          id: String(u._id || u.id || u.username),
          username: u.username || u.name || u.email,
          online: u.online || false,
          lastSeen: u.lastSeen || null,
          avatar: `https://i.pravatar.cc/150?img=${idx + 1}`
        }));

      // Thêm nhóm vào
      const groupConvs = groupsData.map((g, idx) => ({
        id: String(g._id || g.id),
        username: g.name,
        online: false,
        lastSeen: null,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          g.name
        )}&background=random`
      }));

      setConversations([...userConvs, ...groupConvs]);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách:", err);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      console.warn(
        "No logged-in user found in localStorage.user. Please login first."
      );
      return;
    }

    const socket = io(API_BASE, {
      transports: ["websocket"],
      path: "/socket.io",
      query: { userId: currentUserId },
    });
    socketRef.current = socket;

    socket.on("connect", () =>
      console.log("✅ socket connected", socket.id)
    );
    socket.on("connect_error", (err) =>
      console.error("❌ socket connect_error", err)
    );

    socket.on("userOnline", (userId) => {
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(userId) ? { ...c, online: true } : c
        )
      );
    });

    socket.on("userOffline", ({ userId, lastSeen }) => {
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(userId)
            ? { ...c, online: false, lastSeen }
            : c
        )
      );
    });

    socket.on("chatMessage", (msg) => {
      const partnerId =
        String(msg.fromId) === String(currentUserId)
          ? String(msg.to)
          : String(msg.fromId);

      setAllMessages((prev) => {
        const list = prev[partnerId] ? [...prev[partnerId]] : [];
        if (msg._id && list.some((m) => m._id === msg._id)) return prev;
        return { ...prev, [partnerId]: [...list, msg] };
      });

      // Nếu tin nhắn từ người khác và không đang mở đoạn chat với họ -> tăng badge
      if (String(msg.fromId) !== String(currentUserId)) {
        if (!chatWith || String(chatWith.id) !== partnerId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [partnerId]: (prev[partnerId] || 0) + 1,
          }));
          audioRef.current?.play().catch(() => {});
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, chatWith]);

  // Lấy danh sách user + nhóm ban đầu
  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!chatWith || !currentUserId) return;
    const fetchMessages = async () => {
      try {
        const url = `${API_BASE}/messages/${encodeURIComponent(
          chatWith.id
        )}?user=${encodeURIComponent(currentUserId)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setAllMessages((prev) => ({ ...prev, [chatWith.id]: data }));
        setUnreadCounts((prev) => ({ ...prev, [chatWith.id]: 0 }));
      } catch (err) {
        console.error("Lỗi khi lấy tin nhắn:", err);
      }
    };
    fetchMessages();
  }, [chatWith, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, chatWith]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!chatWith || !message.trim()) return;
    const msgObj = {
      username: currentUsername,
      fromId: String(currentUserId),
      to: String(chatWith.id),
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socketRef.current?.emit("chatMessage", msgObj);
    setMessage("");
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const filteredConversations = conversations.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="chat-page container-fluid"
      style={{ backgroundColor: "#f0f2f5", padding: "1rem" }}
    >
      {/* Modal tạo nhóm */}
      {showCreateGroup && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="bg-white p-4 rounded" style={{ width: "400px" }}>
            <h5 className="mb-3">Tạo nhóm mới</h5>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Tên nhóm"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <div className="mb-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
              {conversations.map((user) => (
                <div key={user.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={selectedMembers.includes(user.id)}
                    onChange={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(user.id)
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                    id={`member-${user.id}`}
                  />
                  <label
                    className="form-check-label"
                    htmlFor={`member-${user.id}`}
                  >
                    {user.username}
                  </label>
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateGroup(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/groups`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: groupName,
                        members: [currentUserId, ...selectedMembers],
                      }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    alert("Tạo nhóm thành công!");
                    setShowCreateGroup(false);
                    setGroupName("");
                    setSelectedMembers([]);
                    // Load lại danh sách nhóm và user
                    fetchConversations();
                  } catch (err) {
                    console.error(err);
                    alert("Lỗi khi tạo nhóm!");
                  }
                }}
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/sounds/message.wav" preload="auto" />
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-4 col-lg-3">
          <div className="chat-sidebar p-3 bg-white rounded">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Đoạn chat</h5>
              <button
                className="btn btn-sm btn-success"
                onClick={() => setShowCreateGroup(true)}
              >
                + Nhóm
              </button>
            </div>
            <div className="input-group mb-3">
              <span className="input-group-text">
                <FaSearch />
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="conversation-list">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item d-flex align-items-center gap-2 mb-3 p-2 rounded ${
                    chatWith?.id === conv.id ? "bg-light border" : ""
                  }`}
                  onClick={() => {
                    setChatWith(conv);
                    setUnreadCounts((prev) => ({
                      ...prev,
                      [conv.id]: 0,
                    }));
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="position-relative">
                    <img
                      src={conv.avatar}
                      alt={conv.username}
                      className="rounded-circle"
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      className="position-absolute bottom-0 end-0 border border-white rounded-circle"
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: conv.online ? "green" : "gray",
                      }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold">{conv.username}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: conv.online ? "green" : "gray",
                        fontWeight: "500",
                      }}
                    >
                      {conv.online
                        ? "Hoạt động"
                        : conv.lastSeen
                        ? `Hoạt động ${timeAgo(conv.lastSeen)}`
                        : "Offline"}
                    </div>
                  </div>
                  {unreadCounts[conv.id] > 0 && (
                    <span className="badge bg-danger rounded-pill">
                      {unreadCounts[conv.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="col-md-8 col-lg-9">
          <div
            className="card chat-card shadow-sm"
            style={{ backgroundColor: "#fff", height: "100vh" }}
          >
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <div>
                {chatWith && (
                  <>
                    <h5
                      className="mb-0"
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      💬 {chatWith.username}
                    </h5>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 400,
                        color: "#fff",
                      }}
                    >
                      {chatWith.online
                        ? "Hoạt động"
                        : chatWith.lastSeen
                        ? `Hoạt động ${timeAgo(chatWith.lastSeen)}`
                        : "Offline"}
                    </div>
                  </>
                )}
              </div>
              <div className="d-flex gap-3">
                <FaBell />
                <FaPhone />
                <FaVideo />
                <FaColumns />
              </div>
            </div>

            <div
              className="card-body chat-body"
              style={{ height: "400px", overflowY: "auto" }}
            >
              {!chatWith ? (
                <div className="text-center text-muted mt-5">
                  👈 Chọn người để bắt đầu nhắn tin
                </div>
              ) : (
                (allMessages[chatWith.id] || []).map((msg, index) => {
                  const fromId =
                    msg.fromId ||
                    msg.from ||
                    (msg.username === currentUsername
                      ? currentUserId
                      : null);
                  const isOwnMessage =
                    String(fromId) === String(currentUserId);
                  return (
                    <div
                      key={msg._id || index}
                      className={`mb-3 d-flex ${
                        isOwnMessage
                          ? "justify-content-end"
                          : "justify-content-start"
                      }`}
                    >
                      <div
                        className="p-2 rounded bg-light border"
                        style={{ maxWidth: "75%" }}
                      >
                        <div className="small">{msg.text}</div>
                        <div className="text-end small text-muted mt-1">
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {chatWith && (
              <div className="card-footer bg-white border-top position-relative">
                <form
                  onSubmit={handleSend}
                  className="d-flex align-items-center gap-2"
                >
                  <button
                    type="button"
                    className="emoji-button btn btn-light"
                    onClick={() =>
                      setShowEmojiPicker(!showEmojiPicker)
                    }
                    title="Chọn emoji"
                  >
                    <FaSmile />
                  </button>
                  {showEmojiPicker && (
                    <div
                      className="emoji-picker-container position-absolute"
                      style={{
                        bottom: "60px",
                        zIndex: 1000,
                      }}
                    >
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="form-control"
                    placeholder="Nhập tin nhắn..."
                  />
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center justify-content-center"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                    }}
                    title="Gửi"
                  >
                    <MdSend size={20} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

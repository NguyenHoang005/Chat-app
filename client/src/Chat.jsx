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
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";
const SOCKET_BASE = "http://localhost:8080";


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
  const navigate = useNavigate();
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
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
const [editingText, setEditingText] = useState("");
const [contextMessageId, setContextMessageId] = useState(null);
const contextMenuRef = useRef(null);
const emojiRef = useRef(null);
const emojiButtonRef = useRef(null);

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
      const usersRes = await fetch(`${API_BASE}/users`);
      if (!usersRes.ok) throw new Error(usersRes.statusText);
      const usersData = await usersRes.json();

      // Gọi API groups
      const groupsRes = await fetch(`${API_BASE}/groups`);
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

    const socket = io(SOCKET_BASE, {
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

            // ===== ADDED: TYPING =====
        socket.on("typing", ({ from, groupId }) => {
          console.log("⌨️ TYPING EVENT FROM:", from, "group:", groupId);
          setTypingUsers((prev) => ({
            ...prev,
            [groupId || from]: true,
          }));
        });

        socket.on("stopTyping", ({ from, groupId }) => {
          console.log("🛑 STOP TYPING FROM:", from, "group:", groupId);
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[groupId || from];
            return copy;
          });
        });

        // ===== MESSAGE SEEN =====
          socket.on("messageSeen", ({ messageId, from }) => {
  setAllMessages((prev) => {
    if (!prev[from]) return prev;
        return {
          ...prev,
          [from]: prev[from].map((m) =>
            m._id === messageId ? { ...m, seen: true } : m
          ),
       };
       });
      });

      socket.on("chatMessage", (msg) => {
      const partnerId =
        String(msg.fromId) === String(currentUserId)
          ? String(msg.to)
          : String(msg.fromId);

      setAllMessages((prev) => {
        const list = prev[partnerId] ? [...prev[partnerId]] : [];
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
  }, [currentUserId]);

  // Lấy danh sách user + nhóm ban đầu
  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!chatWith || !currentUserId) return;
    const fetchMessages = async () => {
      try {
        const url = `${API_BASE}/messages/${chatWith.id}?user=${currentUserId}`;
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
  setTypingUsers({});
}, [chatWith]);
useEffect(() => {
  setShowEmojiPicker(false);
}, [chatWith]);

// ✅ THOÁT EDIT KHI ĐỔI NGƯỜI CHAT
useEffect(() => {
  setEditingMessageId(null);
  setEditingText("");
}, [chatWith]);

// ✅ THOÁT EDIT KHI CÓ TIN NHẮN MỚI / LIST MESSAGE ĐỔI
useEffect(() => {
  setEditingMessageId(null);
  setEditingText("");
}, [allMessages]);
useEffect(() => {
  const handleClickOutside = (e) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(e.target)
    ) {
      setContextMessageId(null);
    }
    if (
      emojiRef.current &&
      !emojiRef.current.contains(e.target) &&
      emojiButtonRef.current &&
      !emojiButtonRef.current.contains(e.target)
    ) {
      setShowEmojiPicker(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("click", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("click", handleClickOutside);
  };
}, []);



useEffect(() => {
  const handler = (e) => {
    const updated = e.detail;

    // update sidebar conversations
    setConversations((prev) =>
      prev.map((c) =>
        String(c.id) === String(updated._id)
          ? {
              ...c,
              username: updated.displayName || c.username,
              avatar: updated.avatar
                ? `http://localhost:8080${updated.avatar}`
                : c.avatar,
            }
          : c
      )
    );

    // update header chat đang mở
    setChatWith((prev) =>
      prev && String(prev.id) === String(updated._id)
        ? {
            ...prev,
            username: updated.displayName || prev.username,
            avatar: updated.avatar
              ? `http://localhost:8080${updated.avatar}`
              : prev.avatar,
          }
        : prev
    );
  };

  window.addEventListener("profileUpdated", handler);
  return () =>
    window.removeEventListener("profileUpdated", handler);
}, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, chatWith]);
    
     useEffect(() => {
  if (!chatWith) return;

  const msgs = allMessages[chatWith.id] || [];
  const unseen = msgs.filter(
    (m) =>
      !m.seen &&
      String(m.fromId) !== String(currentUserId)
  );

  unseen.forEach((m) => {
    socketRef.current?.emit("seenMessage", {
      messageId: m._id,
      userId: currentUserId,
    });
  });
}, [allMessages, chatWith]);

   
  const handleSend = (e) => {
    e?.preventDefault();
    if (!chatWith || !message.trim()) return;
    setShowEmojiPicker(false);
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

const EDIT_LIMIT_MINUTES = 5;

// kiểm tra thời gian
const isWithinEditTime = (msg) => {
  if (!msg.timestamp) return false;

  const now = Date.now();
  const sent = new Date(msg.timestamp).getTime();
  return (now - sent) / (1000 * 60) <= EDIT_LIMIT_MINUTES;
};

// ✏️ CHỈNH SỬA
// ❌ recalled | ❌ seen | ❌ quá 5 phút
const canEditMessage = (msg) => {
  if (msg.recalled) return false;
  if (msg.seen) return false;
  return isWithinEditTime(msg);
};

// ↩️ THU HỒI (XOÁ MỌI NGƯỜI)
// ❌ recalled | ❌ quá 5 phút
// ✅ seen vẫn thu hồi được
const canRecallMessage = (msg) => {
  if (msg.recalled) return false;
  return isWithinEditTime(msg);
};

// 🗑 XOÁ PHÍA TÔI
// ❌ nếu đã recalled
const canDeleteForMe = (msg) => {
  return !msg.recalled;
};




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
             {/* Current User Profile */}
            <div
              className="d-flex align-items-center gap-2 mb-3 p-2 rounded"
              style={{ cursor: "pointer", background: "#f5f6f7" }}
              onClick={() => navigate(`/profile/${currentUserId}`)}
            >
              <img
                src={
                  rawUser.avatar
                    ? `http://localhost:8080${rawUser.avatar}`
                    : "https://i.pravatar.cc/150"
                }
                alt="me"
                className="rounded-circle"
                style={{ width: 40, height: 40, objectFit: "cover" }}
              />
              <div className="flex-grow-1">
                <div className="fw-bold">{currentUsername}</div>
                <div style={{ fontSize: 12, color: "gray" }}>
                  Xem profile
                </div>
              </div>
            </div>


                <hr />
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
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${conv.id}`);
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
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/profile/${chatWith.id}`)}
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
  <>
    {(allMessages[chatWith.id] || []).map((msg, index) => {
      const fromId =
        msg.fromId ||
        msg.from ||
        (msg.username === currentUsername ? currentUserId : null);

      const isOwnMessage = String(fromId) === String(currentUserId);

      return (
        <div
          key={msg._id || index}
          className={`mb-3 d-flex ${
            isOwnMessage ? "justify-content-end" : "justify-content-start"
          }`}
        >
          <div
  className="p-2 rounded bg-light border position-relative message-bubble"
  onClick={() => {
    if (isOwnMessage) {
      setContextMessageId(
        contextMessageId === msg._id ? null : msg._id
      );
    }
  }}
>
  {/* ===== CONTENT ===== */}
  {editingMessageId === msg._id ? (
    <input
      autoFocus
      className="form-control form-control-sm"
      value={editingText}
      onChange={(e) => setEditingText(e.target.value)}
      onBlur={() => {
        setEditingMessageId(null);
        setEditingText("");
      }}
      onKeyDown={async (e) => {
        if (e.key === "Escape") {
          setEditingMessageId(null);
          setEditingText("");
        }

        if (e.key === "Enter") {
          await fetch(`${API_BASE}/messages/${msg._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: editingText,
              userId: currentUserId,
            }),
          });

          setAllMessages((prev) => ({
            ...prev,
            [chatWith.id]: prev[chatWith.id].map((m) =>
              m._id === msg._id
                ? { ...m, text: editingText }
                : m
            ),
          }));

          setEditingMessageId(null);
          setEditingText("");
        }
      }}
    />
  ) : (
    <div className={`small ${msg.recalled ? "text-muted fst-italic" : ""}`}>
      {msg.recalled ? "🚫 Tin nhắn đã bị thu hồi" : msg.text}
    </div>
  )}

  {/* ===== MENU ===== */}
  {contextMessageId === msg._id && isOwnMessage && (
    <div ref={contextMenuRef} className="message-menu">
      {canEditMessage(msg) && (
        <button
          onClick={() => {
            setEditingMessageId(msg._id);
            setEditingText(msg.text);
            setContextMessageId(null);
          }}
        >
          ✏️ Chỉnh sửa
        </button>
      )}

      {canRecallMessage(msg) && (
        <button
          onClick={async () => {
            await fetch(
              `${API_BASE}/messages/${msg._id}/recall`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: currentUserId,
                }),
              }
            );

            setAllMessages((prev) => ({
              ...prev,
              [chatWith.id]: prev[chatWith.id].map((m) =>
                m._id === msg._id
                  ? { ...m, recalled: true }
                  : m
              ),
            }));

            setContextMessageId(null);
          }}
        >
          ↩️ Thu hồi (mọi người)
        </button>
      )}

      {canDeleteForMe(msg) && (
        <button
          className="danger"
          onClick={() => {
            setAllMessages((prev) => ({
              ...prev,
              [chatWith.id]: prev[chatWith.id].filter(
                (m) => m._id !== msg._id
              ),
            }));

            setContextMessageId(null);
          }}
        >
          🗑 Xoá phía tôi
        </button>
      )}
    </div>
  )}

  {/* ===== META ===== */}
  <div className="text-end small text-muted mt-1">
    {msg.time}
    {isOwnMessage && (
      <span className="ms-1">{msg.seen ? "✓✓" : "✓"}</span>
    )}
  </div>
</div>
  </div>
      );
    })}

    {/* ✅ typing bubble đúng chỗ */}
    {typingUsers[chatWith.id] && (
      <div className="mb-3 d-flex justify-content-start">
        <div className="typing-bubble">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>     
        </div>
      </div>
    )}

    <div ref={messagesEndRef} />
  </>
)}

            </div>

            {chatWith && (
              <div className="card-footer bg-white border-top position-relative">

                <form
                  onSubmit={handleSend}
                  className="d-flex align-items-center gap-2"
                >
                                      <button
                      ref={emojiButtonRef}
                      type="button"
                      className="emoji-button btn btn-light"
                      onClick={(e) => {
                        e.stopPropagation(); // 👈 QUAN TRỌNG
                        setShowEmojiPicker((prev) => !prev);
                      }}
                      title="Chọn emoji"
                    >
                      <FaSmile />
                    </button>
                  {showEmojiPicker && (
                  <div
                    ref={emojiRef}
                    className="emoji-picker-container position-absolute"
                    style={{ bottom: "60px", zIndex: 1000 }}
                    onClick={(e) => e.stopPropagation()} // 👈 QUAN TRỌNG
                  >
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}

                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                    setMessage(e.target.value);

                    if (!socketRef.current) return;

                    socketRef.current.emit("typing", {
                      from: currentUserId,
                      to: chatWith.id,
                    });

                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }

                    typingTimeoutRef.current = setTimeout(() => {
                      socketRef.current.emit("stopTyping", {
                        from: currentUserId,
                        to: chatWith.id,
                      });
                    }, 2000);
                  }}
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

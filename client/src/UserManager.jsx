import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const API = "http://localhost:8080/users";

function UserManager() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "" });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API);
      setUsers(res.data);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu người dùng:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API}/${editingId}`, form);
        setMessage("Cập nhật người dùng thành công!");
        setEditingId(null);
      } else {
        await axios.post(API, form);
        setMessage("Đã thêm người dùng thành công!");
      }
      setForm({ username: "", email: "" });
      fetchUsers();
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error("Lỗi khi gửi dữ liệu:", error);
      setMessage("Đã xảy ra lỗi.");
    }
  };

  const handleEdit = (user) => {
    setForm({ username: user.username, email: user.email });
    setEditingId(user._id);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Bạn có chắc chắn muốn xoá người dùng này không?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API}/${id}`);
      setMessage("Đã xoá người dùng!");
      fetchUsers();
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error("Lỗi khi xoá người dùng:", error);
      setMessage("Không thể xoá người dùng.");
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow p-4">
        <h1 className="text-center mb-4">
          <span role="img" aria-label="users">👥</span> Quản lý người dùng
        </h1>

        {message && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {message}
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="row g-3 mb-4">
          <div className="col-md-5">
            <input
              type="text"
              placeholder="Tên người dùng"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-5">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-2 d-grid">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Cập nhật" : "Thêm"}
            </button>
          </div>
        </form>

        <ul className="list-group">
          {users.map((user) => (
            <li key={user._id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">{user.username}</h6>
                <small className="text-muted">{user.email}</small>
              </div>
              <div className="btn-group">
                <button
                  onClick={() => handleEdit(user)}
                  className="btn btn-sm btn-warning"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(user._id)}
                  className="btn btn-sm btn-danger"
                >
                  Xoá
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default UserManager;

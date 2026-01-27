import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    status: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("Không có user id");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/${id}`);
        if (!res.ok) throw new Error("Không lấy được profile");

        const data = await res.json();
        setUser(data);
        setForm({
          displayName: data.displayName || "",
          bio: data.bio || "",
          status: data.status || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) return <div className="p-4">⏳ Loading profile...</div>;

  if (error) {
    return (
      <div className="p-4 text-danger">
        ❌ {error}
        <br />
        <button
          className="btn btn-secondary mt-3"
          onClick={() => navigate(-1)}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (avatarFile) {
  const formData = new FormData();
  formData.append("avatar", avatarFile);

  const resAvatar = await fetch(
    `${API_BASE}/users/${user._id}/avatar`,
    {
      method: "POST",
      body: formData,
    }
  );

  const avatarData = await resAvatar.json();
  user.avatar = avatarData.avatar;
}

    const res = await fetch(`${API_BASE}/users/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const updated = await res.json();
    setUser(updated);
    setIsEditing(false);

    // ✅ update localStorage
    const localUser = JSON.parse(localStorage.getItem("user"));
    localStorage.setItem(
      "user",
      JSON.stringify({ ...localUser, ...updated })
    );

    // ✅ phát event cho toàn app
    window.dispatchEvent(
      new CustomEvent("profileUpdated", { detail: updated })
    );
  };

  return (
    <div className="container mt-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>
        ← Quay lại chat
      </button>

      <div className="card p-4 shadow">
        <div className="text-center">
          <img
  src={
    avatarFile
      ? URL.createObjectURL(avatarFile)
      : user.avatar
      ? `http://localhost:8080${user.avatar}`
      : "https://via.placeholder.com/120"
  }
  alt="avatar"
  className="rounded-circle mb-3"
  style={{ width: 120, height: 120, objectFit: "cover" }}
/>
<input
  type="file"
  accept="image/*"
  className="form-control mt-2"
  onChange={(e) => setAvatarFile(e.target.files[0])}
/>

          <h4>{user.displayName || user.username}</h4>
          <p className="text-muted">{user.email}</p>
        </div>

        <hr />

        {isEditing ? (
          <>
            <input
              className="form-control mb-2"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              placeholder="Tên hiển thị"
            />

            <textarea
              className="form-control mb-2"
              value={form.bio}
              onChange={(e) =>
                setForm({ ...form, bio: e.target.value })
              }
              placeholder="Bio"
            />

            <input
              className="form-control mb-2"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
              placeholder="Status"
            />
          </>
        ) : (
          <>
            <p>
              <strong>Bio:</strong>{" "}
              {user.bio || "Chưa có giới thiệu"}
            </p>
            <p>
              <strong>Status:</strong> {user.status}
            </p>
          </>
        )}

        <button
          className="btn btn-primary mt-3"
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
        >
          {isEditing ? "Lưu thay đổi" : "Chỉnh sửa profile"}
        </button>
      </div>
    </div>
  );
};

export default Profile;

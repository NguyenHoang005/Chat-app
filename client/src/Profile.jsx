import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/api";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return <div className="p-4">⏳ Loading profile...</div>;
  }

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

  return (
    <div className="container mt-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>
        ← Quay lại chat
      </button>

      <div className="card p-4 shadow">
        <div className="text-center">
          <img
            src={
              user.avatar
                ? `http://localhost:8080${user.avatar}`
                : "https://via.placeholder.com/120"
            }
            alt="avatar"
            className="rounded-circle mb-3"
            style={{ width: 120, height: 120, objectFit: "cover" }}
          />
          <h4>{user.displayName || user.username}</h4>
          <p className="text-muted">{user.email}</p>
        </div>

        <hr />

        <p>
          <strong>Bio:</strong>{" "}
          {user.bio || "Chưa có giới thiệu"}
        </p>

        <p>
          <strong>Status:</strong> {user.status}
        </p>
      </div>
    </div>
  );
};

export default Profile;

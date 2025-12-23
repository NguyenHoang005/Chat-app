import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://10.24.42.16:8080"; // Đổi IP LAN của server

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const { username, email, password, confirmPassword } = form;

    if (!username.trim() || username.length < 3 || username.length > 30) {
      return "Tên người dùng phải từ 3 đến 30 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      return "Email không hợp lệ.";
    }

    if (password !== confirmPassword) {
      return "Mật khẩu xác nhận không khớp.";
    }

    if (password.length < 6) {
      return "Mật khẩu phải ít nhất 6 ký tự.";
    }

    const strongPass =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!strongPass.test(password)) {
      return "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    return null; // Hợp lệ
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setMessage(errorMsg);
      return;
    }

    try {
      await axios.post(`${API_BASE}/register`, {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });
      setMessage("Đăng ký thành công! Hãy đăng nhập.");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <section className="vh-100" style={{ backgroundColor: "#508bfc" }}>
      <div className="container py-5 h-100">
        <div className="row d-flex justify-content-center align-items-center h-100">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-2-strong" style={{ borderRadius: "1rem" }}>
              <div className="card-body p-5 text-center">

                <h3 className="mb-5">Register</h3>

                {message && <div className="alert alert-info">{message}</div>}

                <form onSubmit={handleRegister}>
                  {/* Username */}
                  <div className="form-outline mb-4">
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      placeholder="Username"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="form-outline mb-4">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      placeholder="Email"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="form-outline mb-4 position-relative">
                    <input
                      type={showPass ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="form-control form-control-lg pe-5"
                      placeholder="Password"
                      required
                    />
                    <i
                      className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"} position-absolute top-50 end-0 translate-middle-y me-3`}
                      style={{ cursor: "pointer", fontSize: "1.3rem" }}
                      onClick={() => setShowPass(!showPass)}
                    ></i>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-outline mb-4 position-relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="form-control form-control-lg pe-5"
                      placeholder="Confirm Password"
                      required
                    />
                    <i
                      className={`bi ${showConfirmPass ? "bi-eye-slash" : "bi-eye"} position-absolute top-50 end-0 translate-middle-y me-3`}
                      style={{ cursor: "pointer", fontSize: "1.3rem" }}
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                    ></i>
                  </div>

                  <button className="btn btn-success w-100 btn-block" type="submit">
                    REGISTER
                  </button>
                </form>

                    {/* Dòng đăng ký đẹp hơn */}
                  <div className="mt-3 text-center">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    style={{ fontSize: "0.95rem", verticalAlign: "0px" }}
                    onClick={() => navigate("/")}
                  >
                    Back to Login
                  </button>
                  </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;

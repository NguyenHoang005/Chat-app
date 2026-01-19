import { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from "react-router-dom"; // Thêm để điều hướng

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8080/api/auth/login", form);
      setMessage(res.data.message);
      localStorage.setItem("user", JSON.stringify(res.data.user));
       localStorage.setItem("token", res.data.token); // Lưu token để dùng API sau
      setTimeout(() => {
      navigate("/chat");
    }, 500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Đăng nhập thất bại.");
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <section className="vh-100" style={{ backgroundColor: "#508bfc" }}>
      <div className="container py-5 h-100">
        <div className="row d-flex justify-content-center align-items-center h-100">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-2-strong" style={{ borderRadius: "1rem" }}>
              <div className="card-body p-5 text-center">

                <h3 className="mb-5">Log in</h3>

                {message && (
                  <div className="alert alert-info">{message}</div>
                )}

                <form onSubmit={handleLogin}>
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

                  <div className="form-outline mb-4">
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      placeholder="Password"
                      required
                    />
                  </div>

                  <div className="form-check d-flex justify-content-start mb-4">
                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                    <label className="form-check-label ms-2" htmlFor="rememberMe">Remember password</label>
                  </div>

                  <button className="btn btn-primary w-100 btn-block" type="submit">
                    LOGIN
                  </button>

                 {/* Dòng đăng ký đẹp hơn */}
                  <div className="mt-3 text-center">
                  <span>Don’t have an account? </span>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    style={{ fontSize: "0.95rem", verticalAlign: "0px" }}
                    onClick={() => navigate("/register")}
                  >
                    Register
                  </button>
                  </div>
                </form>

                <hr className="my-4" />

                <button
  className="btn w-100 btn-block btn-danger mb-2"
  onClick={() => {
    window.location.href = "http://localhost:8080/auth/google";
  }}
>
  <i className="fab fa-google me-2"></i> Sign in with Google
</button>

<button
  className="btn w-100 btn-block btn-primary"
  style={{ backgroundColor: "#3b5998" }}
  onClick={() => {
    window.location.href = "http://localhost:8080/auth/facebook";
  }}
 
>
  <i className="fab fa-facebook-f me-2"></i> Sign in with Facebook
</button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

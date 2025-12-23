import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const userStr = searchParams.get("user");
    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/chat");
    }
  }, []);

  return <div>Đang đăng nhập...</div>;
};

export default OAuthSuccess;

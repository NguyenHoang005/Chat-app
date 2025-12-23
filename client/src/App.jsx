import { Routes, Route } from "react-router-dom";
import UserManager from "./UserManager";
import Login from "./login";
import Chat from "./Chat";
import Register from "./Register";
import OAuthSuccess from "./OAuthSuccess";

function App() {
  return (
    <Routes>
      <Route path="/UserManager" element={<UserManager />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/" element={<Login />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
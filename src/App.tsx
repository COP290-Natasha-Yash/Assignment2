import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BoardsPage from "./pages/BoardsPage";
import MembersPage from "./pages/MembersPage";
import BoardPage from "./pages/BoardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/:projectId/boards" element={<BoardsPage />} />
        <Route path="/projects/:projectId/members" element={<MembersPage />} />
        <Route path="/projects/board" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

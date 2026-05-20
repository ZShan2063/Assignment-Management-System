import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboardPage = ["/teacher", "/student", "/admin-dashboard"].includes(location.pathname);

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="brand">
          <span>Assignment Management System</span>
        </div>
        <div className="nav-links">
          {user && isDashboardPage && <span className="badge">{user.role.toUpperCase()}</span>}
          {!user && location.pathname !== "/" && location.pathname !== "/login" && <Link to="/">Login</Link>}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

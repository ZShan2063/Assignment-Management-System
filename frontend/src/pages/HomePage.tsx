import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="card home-card">
      <h1>Online College Assignment System</h1>
      <p>Select how you want to login.</p>
      <div className="login-role-grid">
        <Link to="/login?role=student" className="login-role-card">
          <span>Student</span>
          <strong>Login as Student</strong>
          <small>Use enrollment number and password</small>
        </Link>
        <Link to="/login?role=teacher" className="login-role-card">
          <span>Teacher</span>
          <strong>Login as Teacher</strong>
          <small>Use username and password</small>
        </Link>
        <Link to="/login?role=admin" className="login-role-card">
          <span>Admin</span>
          <strong>Login as Admin</strong>
          <small>Use admin username and password</small>
        </Link>
      </div>
    </div>
  );
}

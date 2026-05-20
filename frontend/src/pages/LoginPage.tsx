import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type LoginRole = "student" | "teacher" | "admin";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const requestedRole: LoginRole = roleParam === "teacher" || roleParam === "admin" ? roleParam : "student";
  const isStudentLogin = requestedRole === "student";
  const isTeacherLogin = requestedRole === "teacher";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsLoading(true);
    setProgress(0);

    if (!username || !password) {
      const errors: Record<string, string> = {};
      if (!username) errors.username = isStudentLogin ? "Enrollment number is required." : isTeacherLogin ? "Teacher ID is required." : "Username is required.";
      if (!password) errors.password = "Password is required.";
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      await login(username, password, requestedRole);
      setProgress(100);
      const storedUser = localStorage.getItem("authUser");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const destination =
        parsedUser?.role === "admin"
          ? "/admin-dashboard"
          : parsedUser?.role === "teacher"
            ? "/teacher"
            : "/student";
      navigate(destination);
    } catch (err) {
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
      const message = err instanceof Error ? err.message : `Invalid credentials. Please check your ${isStudentLogin ? "enrollment number" : isTeacherLogin ? "teacher ID" : "username"} and password.`;
      setError(message);
      setFieldErrors({ username: isStudentLogin ? "Check your enrollment number" : isTeacherLogin ? "Check your teacher ID" : "Check your username", password: "Check your password" });
    } finally {
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="card">
      <h1>Welcome back</h1>
      <p>{isStudentLogin ? "Login as a student with your enrollment number." : isTeacherLogin ? "Login as a teacher with your teacher ID." : "Login as admin with your username."}</p>
      <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
          <label htmlFor="username">{isStudentLogin ? "Enrollment Number" : isTeacherLogin ? "Teacher ID" : "Username"}</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={fieldErrors.username ? "invalid" : ""}
            required
          />
          {fieldErrors.username && <div className="field-error-text">{fieldErrors.username}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldErrors.password ? "invalid" : ""}
            required
          />
          {fieldErrors.password && <div className="field-error-text">{fieldErrors.password}</div>}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          ) : (
            "Login"
          )}
        </button>
      </form>
      <div className="form-footer">
        {isStudentLogin && (
          <p>
            Have an enrollment number? <Link className="notice-link" to="/register">Create account</Link>
          </p>
        )}
        <p>
          <Link className="notice-link" to="/">Choose another login</Link>
        </p>
        <p>
          <Link className="notice-link" to={`/forgot-password?role=${requestedRole}`}>Forgot password</Link>
        </p>
      </div>
    </div>
  );
}

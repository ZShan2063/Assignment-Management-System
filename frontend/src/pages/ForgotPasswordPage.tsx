import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiCall } from "../services/api";

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState(searchParams.get("role") || "student");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isAdmin = role === "admin";
  const identifierLabel = role === "student" ? "Enrollment Number" : role === "teacher" ? "Teacher ID" : "Admin Username";

  const lookupEmail = async (nextIdentifier = identifier) => {
    setMessage("");
    setError("");
    setEmail("");
    if (isAdmin || !nextIdentifier.trim()) {
      return;
    }
    try {
      const response = await apiCall(`/users/forgot-password/?role=${role}&identifier=${encodeURIComponent(nextIdentifier.trim())}`, "GET");
      setEmail(response.email || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find this account.");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      if (!isAdmin && !email) {
        await lookupEmail();
      }
      const response = await apiCall("/users/forgot-password/", "POST", {
        identifier,
        role,
        email,
        frontend_url: window.location.origin,
      });
      setMessage(response.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset link.");
    }
  };

  return (
    <div className="card">
      <h1>Forgot password</h1>
      <p>
        {role === "student"
          ? "Enter your enrollment number. The registered email will be fetched automatically."
          : role === "teacher"
            ? "Enter your teacher ID. The registered email will be fetched automatically."
            : "Enter your admin username and registered email."}
      </p>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="role">Account Type</label>
          <select id="role" value={role} onChange={(e) => {
            setRole(e.target.value);
            setIdentifier("");
            setEmail("");
            setError("");
            setMessage("");
          }}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="identifier">{identifierLabel}</label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (!isAdmin) setEmail("");
            }}
            onBlur={() => lookupEmail()}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">{isAdmin ? "Admin Email" : "Registered Email"}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={!isAdmin}
            placeholder={!isAdmin ? "Email will appear automatically" : "Enter admin email"}
            required
          />
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit">Send Reset Link</button>
      </form>
      <div className="form-footer">
        <Link className="notice-link" to="/">Choose another login</Link>
        <Link className="notice-link" to="/reset-password">I have a reset token</Link>
      </div>
    </div>
  );
}

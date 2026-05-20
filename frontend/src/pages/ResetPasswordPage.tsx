import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiCall } from "../services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const response = await apiCall("/users/reset-password/", "POST", { token, password });
      setMessage(response.detail);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    }
  };

  return (
    <div className="card">
      <h1>Reset password</h1>
      <p>Enter the reset token from your email and set a new password.</p>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="token">Reset Token</label>
          <input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit">Reset Password</button>
      </form>
      <div className="form-footer">
        <Link className="notice-link" to="/">Choose login</Link>
      </div>
    </div>
  );
}

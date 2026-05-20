import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiCall } from "../services/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const verify = async (event?: FormEvent) => {
    event?.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await apiCall("/users/verify-email/", "POST", { token });
      setMessage(response.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify email.");
    }
  };

  useEffect(() => {
    if (token) {
      verify();
    }
  }, []);

  return (
    <div className="card">
      <h1>Verify email</h1>
      <p>Enter the verification token from your email.</p>
      <form className="form-grid" onSubmit={verify}>
        <div className="form-group">
          <label htmlFor="verifyToken">Verification Token</label>
          <input id="verifyToken" value={token} onChange={(event) => setToken(event.target.value)} required />
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit">Verify Email</button>
      </form>
      <div className="form-footer">
        <Link className="notice-link" to="/">Choose login</Link>
      </div>
    </div>
  );
}

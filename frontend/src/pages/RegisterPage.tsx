import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiCall } from "../services/api";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    mobile_number: "",
    course: "",
    first_name: "",
    last_name: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [accountAlreadyCreated, setAccountAlreadyCreated] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccess("");
    if (name === "username") {
      setError("");
      setAccountAlreadyCreated(false);
      setFieldErrors((prev) => ({ ...prev, username: "" }));
      setFormData((prev) => ({ ...prev, [name]: value, email: "", mobile_number: "", course: "" }));
    }
  };

  const loadStudentDetails = async () => {
    const enrollmentNumber = formData.username.trim();
    if (!enrollmentNumber) {
      return false;
    }
    try {
      const data = await apiCall(`/users/student/create-account/?username=${encodeURIComponent(enrollmentNumber)}`, "GET");
      setFormData((prev) => ({
        ...prev,
        email: data.email || "",
        mobile_number: data.mobile_number || "",
        course: data.course || "",
      }));
      if (data.account_created) {
        setAccountAlreadyCreated(true);
        setError("This student account is already created. Please login.");
        return false;
      }
      setAccountAlreadyCreated(false);
      setError("");
      setFieldErrors((prev) => ({ ...prev, username: "" }));
      return true;
    } catch (err) {
      setFormData((prev) => ({ ...prev, email: "", mobile_number: "", course: "" }));
      setAccountAlreadyCreated(false);
      setError(err instanceof Error ? err.message : "Enrollment number was not found.");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const studentFound = await loadStudentDetails();
    if (!studentFound) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    try {
      await apiCall("/users/student/create-account/", "POST", {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
      });
      setSuccess("Your account is ready. Redirecting to login...");
      setTimeout(() => navigate("/login?role=student"), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Account creation failed. Please check your details and try again.";
      setError(message);
      if ((err as any).details && typeof (err as any).details === "object") {
        const details = (err as any).details as Record<string, any>;
        const fieldMap: Record<string, string> = {};
        Object.entries(details).forEach(([key, value]) => {
          if (key === "non_field_errors" || key === "detail") return;
          fieldMap[key] = Array.isArray(value) ? value.join(" ") : String(value);
        });
        setFieldErrors(fieldMap);
      }
    }
  };

  return (
    <div className="card">
      <h1>Create your account</h1>
      <p>Enter the enrollment number provided by admin and set your password.</p>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="username">Enrollment Number</label>
          <input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={loadStudentDetails}
            className={fieldErrors.username ? "invalid" : ""}
            required
          />
          {fieldErrors.username && <div className="field-error-text">{fieldErrors.username}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" value={formData.email} readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="mobile_number">Phone Number</label>
            <input id="mobile_number" name="mobile_number" value={formData.mobile_number} readOnly />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="course">Program</label>
          <input id="course" name="course" value={formData.course} readOnly />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={fieldErrors.first_name ? "invalid" : ""}
              disabled={accountAlreadyCreated}
              required
            />
            {fieldErrors.first_name && <div className="field-error-text">{fieldErrors.first_name}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={fieldErrors.last_name ? "invalid" : ""}
              disabled={accountAlreadyCreated}
              required
            />
            {fieldErrors.last_name && <div className="field-error-text">{fieldErrors.last_name}</div>}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className={fieldErrors.password ? "invalid" : ""}
            disabled={accountAlreadyCreated}
            required
          />
          {fieldErrors.password && <div className="field-error-text">{fieldErrors.password}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={fieldErrors.confirmPassword ? "invalid" : ""}
            disabled={accountAlreadyCreated}
            required
          />
          {fieldErrors.confirmPassword && <div className="field-error-text">{fieldErrors.confirmPassword}</div>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <button type="submit" disabled={accountAlreadyCreated}>Create Account</button>
      </form>
      <div className="form-footer">
        <p>
          Already created your account? <Link to="/login?role=student">Login</Link>
        </p>
      </div>
    </div>
  );
}

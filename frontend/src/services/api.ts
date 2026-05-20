const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const fieldLabels: Record<string, string> = {
  username: "Enrollment/Username",
  email: "Email",
  mobile_number: "Phone number",
  teacher_id: "Teacher ID",
  password: "Password",
};

const apiCall = async (
  endpoint: string,
  method: string = "GET",
  body?: Record<string, any> | FormData,
  isFormData = false
) => {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const payload = body ? (isFormData ? body : JSON.stringify(body)) : undefined;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: payload as BodyInit | undefined,
  });

  if (!response.ok) {
    if (response.status === 401 && endpoint !== "/users/login/") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      window.location.href = "/";
    }

    let errorMessage = `API Error: ${response.statusText}`;
    let errorDetails = null;
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      try {
        const errorJson = await response.json();
        errorDetails = errorJson;

        if (errorJson) {
          if (errorJson.detail) {
            errorMessage = errorJson.detail;
          } else if (errorJson.non_field_errors) {
            errorMessage = Array.isArray(errorJson.non_field_errors)
              ? errorJson.non_field_errors.join(" ")
              : errorJson.non_field_errors;
          } else if (typeof errorJson === "object") {
            const fieldMessages = Object.entries(errorJson)
              .map(([key, value]) =>
                `${fieldLabels[key] || key}: ${Array.isArray(value) ? value.join(" ") : value}`
              )
              .join(" ");
            if (fieldMessages) {
              errorMessage = fieldMessages;
            }
          }
        }
      } catch {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
    } else {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }

    const error = new Error(errorMessage);
    (error as any).details = errorDetails;
    throw error;
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
};

const downloadApiFile = async (endpoint: string, filename: string) => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Token ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Unable to download ${filename}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export { apiCall, downloadApiFile, API_BASE_URL };

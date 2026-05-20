import { ChangeEvent, useState } from "react";
import { apiCall, downloadApiFile } from "../services/api";

export default function ReportsPanel() {
  const [restoreMessage, setRestoreMessage] = useState("");
  const [restorePreview, setRestorePreview] = useState<{ total_objects: number; models: Record<string, number> } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    program: "",
    role: "",
    status: "",
    result: "",
    date_from: "",
    date_to: "",
  });

  const reportQuery = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const previewBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await apiCall("/upgrades/reports/backup/restore/?preview=true", "POST", formData, true);
      setRestorePreview(response);
    } catch (error) {
      setRestorePreview(null);
      setRestoreMessage(error instanceof Error ? error.message : "Backup preview failed.");
    }
  };

  const restoreBackup = async () => {
    if (!restoreFile) return;
    if (!window.confirm(`Restore ${restorePreview?.total_objects || 0} backup records? Existing matching records can be overwritten.`)) {
      return;
    }
    const formData = new FormData();
    formData.append("file", restoreFile);
    formData.append("confirm", "RESTORE");
    try {
      const response = await apiCall("/upgrades/reports/backup/restore/", "POST", formData, true);
      setRestoreMessage(`Backup restored: ${response.restored} records.`);
      setRestorePreview(null);
      setRestoreFile(null);
    } catch (error) {
      setRestoreMessage(error instanceof Error ? error.message : "Backup restore failed.");
    }
  };

  return (
    <div className="reports-panel">
      <div className="report-filter-grid">
        <input
          placeholder="Search reports"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <input
          placeholder="Program"
          value={filters.program}
          onChange={(e) => setFilters({ ...filters, program: e.target.value })}
        />
        <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All assignment status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
        <select value={filters.result} onChange={(e) => setFilters({ ...filters, result: e.target.value })}>
          <option value="">All results</option>
          <option value="pending">Pending</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
        />
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => setFilters({ search: "", program: "", role: "", status: "", result: "", date_from: "", date_to: "" })}
        >
          Clear Filters
        </button>
      </div>
      <div className="button-row">
        <button type="button" onClick={() => downloadApiFile(`/upgrades/reports/assignments/${reportQuery()}`, "assignments_report.csv")}>
          Download Assignment Report
        </button>
        <button type="button" onClick={() => downloadApiFile(`/upgrades/reports/submissions/${reportQuery()}`, "submissions_report.csv")}>
          Download Submission Report
        </button>
        <button type="button" onClick={() => downloadApiFile(`/upgrades/reports/users/${reportQuery()}`, "users_report.csv")}>
          Download Users Report
        </button>
        <button type="button" onClick={() => downloadApiFile(`/upgrades/reports/courses/${reportQuery()}`, "courses_report.csv")}>
          Download Course Report
        </button>
        <button type="button" onClick={() => downloadApiFile(`/upgrades/reports/audit/${reportQuery({ action: "" })}`, "audit_report.csv")}>
          Download Audit Report
        </button>
        <button type="button" onClick={() => downloadApiFile("/upgrades/reports/backup/", "ams_backup.json")}>
          Download System Backup
        </button>
      </div>
      <label className="backup-restore-control">
        <span>Restore Backup JSON</span>
        <input type="file" accept=".json,application/json" onChange={previewBackup} />
      </label>
      {restorePreview && (
        <div className="restore-preview-box">
          <strong>{restorePreview.total_objects} records found in backup</strong>
          <p>{Object.entries(restorePreview.models).map(([model, count]) => `${model}: ${count}`).join(", ")}</p>
          <button type="button" className="danger-button compact-button" onClick={restoreBackup}>Confirm Restore</button>
        </div>
      )}
      {restoreMessage && <p className="muted-text">{restoreMessage}</p>}
    </div>
  );
}

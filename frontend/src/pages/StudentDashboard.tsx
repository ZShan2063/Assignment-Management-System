import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, downloadApiFile } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { Assignment, Submission } from "../types";
import { formatDate, formatDateOnly } from "../utils/date";
import AnalyticsPanel from "../components/AnalyticsPanel";
import FilePreviewer from "../components/FilePreviewer";
import NotificationCenter from "../components/NotificationCenter";
import Pagination from "../components/Pagination";
import AssignmentDiscussion from "../components/AssignmentDiscussion";

type StudentSection = "overview" | "assignments" | "submit" | "submissions" | "password" | "profile";
type SortDirection = "asc" | "desc";
const pageSize = 6;

export default function StudentDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<StudentSection>("assignments");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email_notifications_enabled: user?.email_notifications_enabled ?? true,
    deadline_reminders_enabled: user?.deadline_reminders_enabled ?? true,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [progress, setProgress] = useState({});
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("all");
  const [assignmentSort, setAssignmentSort] = useState<{ key: string; direction: SortDirection }>({ key: "assignment_number", direction: "asc" });
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [submissionSort, setSubmissionSort] = useState<{ key: string; direction: SortDirection }>({ key: "assignment_number", direction: "asc" });
  const [submissionPage, setSubmissionPage] = useState(1);

  const compareValues = (first: string | number | boolean | null | undefined, second: string | number | boolean | null | undefined, direction: SortDirection) => {
    const firstValue = typeof first === "number" ? first : String(first ?? "").toLowerCase();
    const secondValue = typeof second === "number" ? second : String(second ?? "").toLowerCase();
    if (firstValue < secondValue) return direction === "asc" ? -1 : 1;
    if (firstValue > secondValue) return direction === "asc" ? 1 : -1;
    return 0;
  };

  const sortLabel = (sort: { key: string; direction: SortDirection }, key: string) => sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "";

  const updateAssignmentSort = (key: string) => {
    setAssignmentSort((sort) => ({ key, direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc" }));
  };

  const updateSubmissionSort = (key: string) => {
    setSubmissionSort((sort) => ({ key, direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc" }));
  };

  const loadData = async () => {
    try {
      const [assignmentData, submissionData, progressData] = await Promise.all([
        apiCall("/assignments/", "GET"),
        apiCall("/submissions/", "GET"),
        apiCall("/upgrades/analytics/student/", "GET"),
      ]);
      const studentProgram = (user?.course || "").trim().toLowerCase();
      setAssignments(
        assignmentData.filter((assignment: Assignment) => (
          !studentProgram || assignment.program.trim().toLowerCase() === studentProgram
        ))
      );
      setSubmissions(submissionData);
      setProgress(progressData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setProfileForm({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email_notifications_enabled: user?.email_notifications_enabled ?? true,
      deadline_reminders_enabled: user?.deadline_reminders_enabled ?? true,
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !file) {
      setMessageType("error");
      setMessage("Please choose an assignment and upload a file before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);

    const formData = new FormData();
    formData.append("assignment", selectedAssignment.toString());
    formData.append("uploaded_file", file);
    formData.append("comment", comment);

    const progressInterval = setInterval(() => {
      setSubmitProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      await apiCall("/submissions/", "POST", formData, true);
      setSubmitProgress(100);
      setMessageType("success");
      setMessage("Submission uploaded successfully.");
      setComment("");
      setFile(null);
      await loadData();
    } catch (err) {
      setSubmitProgress(0);
      setMessageType("error");
      setMessage("Unable to submit. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setIsSubmitting(false);
    }
  };

  const renderOverview = () => (
    <div className="workspace-panel">
      <h2>Welcome back</h2>
      <p>Review active assignments, submit work, and track grades from a single dashboard.</p>
      <AnalyticsPanel data={progress} />
      <NotificationCenter />
    </div>
  );

  const renderAssignments = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <div>
          <h3>Active assignments</h3>
          <p>All available assignments are listed below for your course/subject and semester.</p>
        </div>
        <span className="badge">{loading ? "Loading..." : `${filteredAssignments.length} items`}</span>
      </div>

      <div className="search-bar">
        <label htmlFor="studentAssignmentSearch">Search assignment</label>
        <input
          id="studentAssignmentSearch"
          type="search"
          value={assignmentSearch}
          onChange={(e) => { setAssignmentSearch(e.target.value); setAssignmentPage(1); }}
          placeholder="Search by assignment number, title, program, or subject"
        />
      </div>
      <div className="table-tools filter-tools">
        <select value={assignmentStatusFilter} onChange={(e) => { setAssignmentStatusFilter(e.target.value); setAssignmentPage(1); }}>
          <option value="all">All active assignments</option>
          <option value="open">Open deadline</option>
          <option value="late-allowed">Late allowed</option>
          <option value="deadline-passed">Deadline passed</option>
        </select>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("assignment_number")}>Assignment No. {sortLabel(assignmentSort, "assignment_number")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("title")}>Title {sortLabel(assignmentSort, "title")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("due_date")}>Deadline {sortLabel(assignmentSort, "due_date")}</button>
      </div>

      {filteredAssignments.length === 0 ? (
        <p>No assignments are available yet. Check back soon.</p>
      ) : (
        <div className="content-list">
          {paginatedAssignments.map((assignment) => {
              const attemptsUsed = submissions.filter((submission) => submission.assignment === assignment.id).length;
              const canSubmit = attemptsUsed === 0 || (assignment.allow_resubmission && attemptsUsed < assignment.max_attempts);
              return (
                <div key={assignment.id} className="assignment-card">
                  <h3>{assignment.title}</h3>
                  <div className="assignment-meta">
                    <span>No. {assignment.assignment_number}</span>
                    <span>{assignment.course}</span>
                    <span>{assignment.program}</span>
                    <span>Sem {assignment.semester}</span>
                    <span>Status {assignment.display_status || assignment.status}</span>
                    <span>Attempts {attemptsUsed}/{assignment.max_attempts}</span>
                    <span>Due {formatDateOnly(assignment.due_date)}</span>
                  </div>
                  <p>{assignment.description}</p>
                  {assignment.assignment_file && (
                    <div className="assignment-file-block">
                      <span className="file-block-label">File:</span>
                      <FilePreviewer fileUrl={assignment.assignment_file} label="Preview assignment file" />
                    </div>
                  )}
                  {assignment.allow_late_submission && (
                    <p className="muted-text">
                      Late submission allowed
                      {assignment.late_submission_until ? ` until ${formatDateOnly(assignment.late_submission_until)}` : ""}.
                      {" "}Penalty: {assignment.late_penalty_points} points. {assignment.late_submission_note}
                    </p>
                  )}
                  {!assignment.allow_resubmission && attemptsUsed > 0 && <p className="muted-text">Resubmission is not allowed for this assignment.</p>}
                  <AssignmentDiscussion assignmentId={assignment.id} />
                  <div className="assignment-submit-row">
                    <button type="button" className="compact-button" disabled={!canSubmit} onClick={() => { setSelectedAssignment(assignment.id); setActiveSection("submit"); }}>
                      {attemptsUsed > 0 ? "Submit Again" : "Submit Work"}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
      <Pagination page={assignmentPage} pageSize={pageSize} total={filteredAssignments.length} onPageChange={setAssignmentPage} />
    </div>
  );

  const renderSubmit = () => (
    <div className="workspace-panel">
      <h3>Submit assignment</h3>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="assignment">Assignment</label>
          <select
            id="assignment"
            value={selectedAssignment ?? ""}
            onChange={(e) => setSelectedAssignment(Number(e.target.value))}
          >
            <option value="">Choose an assignment</option>
            {sortedAssignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.assignment_number} - {assignment.title} - {assignment.course}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="file">Upload File</label>
          <input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="comment">Comments</label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a short note for your instructor"
          />
        </div>

        {message && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${submitProgress}%` }}></div>
              </div>
              <span className="progress-text">{submitProgress}%</span>
            </div>
          ) : (
            "Upload Submission"
          )}
        </button>
      </form>
    </div>
  );

  const renderSubmissions = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <h3>Recent submissions</h3>
        <button type="button" className="compact-button" onClick={() => downloadApiFile("/upgrades/reports/student-transcript/", `${user?.username || "student"}_transcript.csv`)}>
          Download Transcript
        </button>
      </div>
      <div className="search-bar">
        <label htmlFor="submissionSearch">Search submissions</label>
        <input
          id="submissionSearch"
          type="search"
          value={submissionSearch}
          onChange={(e) => { setSubmissionSearch(e.target.value); setSubmissionPage(1); }}
          placeholder="Search by assignment number, title, status, or comment"
        />
      </div>
      <div className="table-tools filter-tools">
        <select value={submissionStatusFilter} onChange={(e) => { setSubmissionStatusFilter(e.target.value); setSubmissionPage(1); }}>
          <option value="all">All submissions</option>
          <option value="pending">Pending</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="late">Late</option>
          <option value="on-time">On time</option>
        </select>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("assignment_number")}>Assignment No. {sortLabel(submissionSort, "assignment_number")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("submitted_at")}>Submitted {sortLabel(submissionSort, "submitted_at")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("score")}>Score {sortLabel(submissionSort, "score")}</button>
      </div>
      {filteredSubmissions.length === 0 ? (
        <p>You haven't submitted anything yet.</p>
      ) : (
        <div className="submission-history-list">
          {paginatedSubmissionGroups.map((group) => (
            <div key={group.assignment} className="submission-history-card">
              <div className="card-title-row">
                <div>
                  <h3>{group.title}</h3>
                  <div className="assignment-meta">
                    <span>Assignment No. {group.assignment_number}</span>
                    <span>{group.attempts.length} attempt{group.attempts.length === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <button type="button" className="compact-button" onClick={() => { setSelectedAssignment(group.assignment); setActiveSection("submit"); }}>
                  Submit Again
                </button>
              </div>
              <div className="attempt-timeline">
                {group.attempts.map((submission) => (
                  <div key={submission.id} className={`attempt-item ${submission.score != null ? submission.score >= 40 ? "attempt-pass" : "attempt-fail" : ""}`}>
                    <div className="attempt-header">
                      <strong>Attempt {submission.attempt_number}</strong>
                      <span>{submission.is_late ? "Late" : "On time"}</span>
                    </div>
                    <div className="assignment-meta">
                      <span>Submitted {formatDate(submission.submitted_at)}</span>
                      <span>Status {submission.result_status || "Pending"}</span>
                      {submission.score != null && <span>Score {submission.score}</span>}
                    </div>
                    <p>{submission.comment || "No comments provided."}</p>
                    {submission.feedback && <p><strong>Feedback:</strong> {submission.feedback}</p>}
                    <FilePreviewer fileUrl={submission.uploaded_file} label="Submitted file" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={submissionPage} pageSize={pageSize} total={submissionGroups.length} onPageChange={setSubmissionPage} />
    </div>
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (!window.confirm("Are you sure you want to change your password? You will be logged out.")) {
      return;
    }
    try {
      await apiCall("/users/me/password/", "POST", {
        password: passwordForm.password,
      });
      setPasswordForm({ password: "", confirmPassword: "" });
      window.alert("Password changed successfully. Please login again.");
      logout();
      navigate("/");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to change password.");
    }
  };

  const renderPassword = () => (
    <div className="workspace-panel">
      <h3>Change Password</h3>
      <form onSubmit={handlePasswordChange} className="form-grid">
        <div className="form-group">
          <label htmlFor="studentPassword">New Password</label>
          <input
            id="studentPassword"
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="studentConfirmPassword">Confirm Password</label>
          <input
            id="studentConfirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            required
          />
        </div>
        {message && activeSection === "password" && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
        <button type="submit">Update Password</button>
      </form>
    </div>
  );

  const renderProfile = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <h3>Profile</h3>
        {!isEditingProfile && (
          <button type="button" className="compact-button" onClick={() => setIsEditingProfile(true)}>
            Edit
          </button>
        )}
      </div>
      {isEditingProfile && (
        <form
          className="form-grid profile-edit-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const updatedUser = await apiCall("/users/me/", "PATCH", profileForm);
              updateUser(updatedUser);
              setIsEditingProfile(false);
              setMessageType("success");
              setMessage("Profile updated successfully.");
            } catch (error) {
              setMessageType("error");
              setMessage(error instanceof Error ? error.message : "Unable to update profile.");
            }
          }}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="studentFirstName">First Name</label>
              <input
                id="studentFirstName"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="studentLastName">Last Name</label>
              <input
                id="studentLastName"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
              />
            </div>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={profileForm.email_notifications_enabled}
              onChange={(e) => setProfileForm({ ...profileForm, email_notifications_enabled: e.target.checked })}
            />
            Email notifications
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={profileForm.deadline_reminders_enabled}
              onChange={(e) => setProfileForm({ ...profileForm, deadline_reminders_enabled: e.target.checked })}
            />
            Deadline reminders
          </label>
          {message && activeSection === "profile" && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
          <div className="button-row">
            <button type="submit">Update Profile</button>
            <button type="button" className="secondary-button" onClick={() => {
              setProfileForm({
                first_name: user?.first_name || "",
                last_name: user?.last_name || "",
                email_notifications_enabled: user?.email_notifications_enabled ?? true,
                deadline_reminders_enabled: user?.deadline_reminders_enabled ?? true,
              });
              setIsEditingProfile(false);
            }}>Cancel</button>
          </div>
        </form>
      )}
      {message && activeSection === "profile" && !isEditingProfile && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
      <div className="profile-grid">
        <div><span>First Name</span><strong>{user?.first_name || "-"}</strong></div>
        <div><span>Last Name</span><strong>{user?.last_name || "-"}</strong></div>
        <div><span>Enrollment Number</span><strong>{user?.username || "-"}</strong></div>
        <div><span>Email</span><strong>{user?.email || "-"}</strong></div>
        <div><span>Program</span><strong>{user?.course || "-"}</strong></div>
        <div><span>Phone Number</span><strong>{user?.mobile_number || "-"}</strong></div>
      </div>
    </div>
  );

  const sectionContent = {
    overview: renderOverview,
    assignments: renderAssignments,
    submit: renderSubmit,
    submissions: renderSubmissions,
    password: renderPassword,
    profile: renderProfile,
  };

  const sortedAssignments = [...assignments].sort((first, second) => first.assignment_number - second.assignment_number);
  const filteredAssignments = assignments
    .filter((assignment) => {
      const search = assignmentSearch.trim().toLowerCase();
      const dueTime = new Date(assignment.due_date).getTime();
      const now = Date.now();
      const matchesSearch =
        !search ||
        String(assignment.assignment_number).includes(search) ||
        assignment.title.toLowerCase().includes(search) ||
        assignment.program.toLowerCase().includes(search) ||
        assignment.course.toLowerCase().includes(search);
      const matchesStatus =
        assignmentStatusFilter === "all" ||
        (assignmentStatusFilter === "open" && dueTime >= now) ||
        (assignmentStatusFilter === "late-allowed" && assignment.allow_late_submission) ||
        (assignmentStatusFilter === "deadline-passed" && dueTime < now);
      return matchesSearch && matchesStatus;
    })
    .sort((first, second) => {
      const getValue = (assignment: Assignment) => {
        if (assignmentSort.key === "title") return assignment.title;
        if (assignmentSort.key === "due_date") return assignment.due_date;
        return assignment.assignment_number;
      };
      return compareValues(getValue(first), getValue(second), assignmentSort.direction);
    });
  const paginatedAssignments = filteredAssignments.slice((assignmentPage - 1) * pageSize, assignmentPage * pageSize);

  const filteredSubmissions = submissions
    .filter((submission) => {
      const search = submissionSearch.trim().toLowerCase();
      const hasScore = submission.score != null;
      const passed = hasScore && submission.score! >= 40;
      const statusText = hasScore ? (passed ? "pass" : "fail") : "pending";
      const matchesSearch =
        !search ||
        String(submission.assignment_number).includes(search) ||
        submission.assignment_title.toLowerCase().includes(search) ||
        submission.comment.toLowerCase().includes(search) ||
        statusText.includes(search);
      const matchesStatus =
        submissionStatusFilter === "all" ||
        (submissionStatusFilter === "pending" && !hasScore) ||
        (submissionStatusFilter === "pass" && passed) ||
        (submissionStatusFilter === "fail" && hasScore && !passed) ||
        (submissionStatusFilter === "late" && submission.is_late) ||
        (submissionStatusFilter === "on-time" && !submission.is_late);
      return matchesSearch && matchesStatus;
    })
    .sort((first, second) => {
      const getValue = (submission: Submission) => {
        if (submissionSort.key === "submitted_at") return submission.submitted_at;
        if (submissionSort.key === "score") return submission.score ?? -1;
        return submission.assignment_number;
      };
      return compareValues(getValue(first), getValue(second), submissionSort.direction);
    });
  const submissionGroups = Object.values(filteredSubmissions.reduce<Record<number, { assignment: number; assignment_number: number; title: string; attempts: Submission[] }>>((groups, submission) => {
    if (!groups[submission.assignment]) {
      groups[submission.assignment] = {
        assignment: submission.assignment,
        assignment_number: submission.assignment_number,
        title: submission.assignment_title,
        attempts: [],
      };
    }
    groups[submission.assignment].attempts.push(submission);
    return groups;
  }, {})).map((group) => ({
    ...group,
    attempts: group.attempts.sort((first, second) => second.attempt_number - first.attempt_number),
  }));
  const paginatedSubmissionGroups = submissionGroups.slice((submissionPage - 1) * pageSize, submissionPage * pageSize);

  return (
    <div className="workspace-layout">
      <aside className="side-menu">
        <div className="side-menu-heading">
          <h2>Student</h2>
          <p>Assignment workspace</p>
        </div>
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")}>Overview</button>
        <button className={activeSection === "assignments" ? "active" : ""} onClick={() => setActiveSection("assignments")}>Assignments</button>
        <button className={activeSection === "submit" ? "active" : ""} onClick={() => setActiveSection("submit")}>Submit Work</button>
        <button className={activeSection === "submissions" ? "active" : ""} onClick={() => setActiveSection("submissions")}>Submissions</button>
        <button className={activeSection === "password" ? "active" : ""} onClick={() => setActiveSection("password")}>Change Password</button>
        <div className="sidebar-bottom">
          <button className={activeSection === "profile" ? "active" : ""} onClick={() => setActiveSection("profile")}>Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <section className="workspace-content">{sectionContent[activeSection]()}</section>
    </div>
  );
}

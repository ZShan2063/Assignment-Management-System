import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "../services/api";
import { Assignment, Course, Program } from "../types";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateOnly } from "../utils/date";
import AnalyticsPanel from "../components/AnalyticsPanel";
import FilePreviewer from "../components/FilePreviewer";
import NotificationCenter from "../components/NotificationCenter";
import Pagination from "../components/Pagination";
import AssignmentDiscussion from "../components/AssignmentDiscussion";

type TeacherSection = "overview" | "assignments" | "create" | "submissions" | "profile" | "password";
type SortDirection = "asc" | "desc";
const pageSize = 8;

interface Submission {
  id: number;
  assignment: number;
  assignment_title: string;
  student: string;
  student_full_name?: string;
  uploaded_file: string;
  comment: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
  is_late: boolean;
}

export default function TeacherDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<TeacherSection>("overview");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [totalPoints, setTotalPoints] = useState(100);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [lateSubmissionUntil, setLateSubmissionUntil] = useState("");
  const [latePenaltyPoints, setLatePenaltyPoints] = useState(0);
  const [lateSubmissionNote, setLateSubmissionNote] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<Assignment["status"]>("active");
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [analytics, setAnalytics] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [gradingSubmission, setGradingSubmission] = useState<number | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentSort, setAssignmentSort] = useState<{ key: string; direction: SortDirection }>({ key: "assignment_number", direction: "asc" });
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [discussionAssignmentId, setDiscussionAssignmentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [submissionSort, setSubmissionSort] = useState<{ key: string; direction: SortDirection }>({ key: "student", direction: "asc" });
  const [submissionPage, setSubmissionPage] = useState(1);
  const [gradeProgram, setGradeProgram] = useState("");
  const [gradeSemester, setGradeSemester] = useState(1);
  const [gradeCourse, setGradeCourse] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeProgress, setGradeProgress] = useState(0);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    address: user?.address || "",
    email_notifications_enabled: user?.email_notifications_enabled ?? true,
    deadline_reminders_enabled: user?.deadline_reminders_enabled ?? true,
  });

  const assignedProgram = user?.course || "";
  const assignedSubjectCodes = useMemo(() => (user?.assigned_subjects || "")
    .split(",")
    .map((subject) => subject.trim().toLowerCase())
    .filter(Boolean), [user?.assigned_subjects]);
  const availablePrograms = useMemo(() => assignedProgram
    ? programs.filter((option) => option.name === assignedProgram)
    : programs, [assignedProgram, programs]);
  const availableCourses = useMemo(() => assignedProgram
    ? courses.filter((option) => option.program === assignedProgram)
    : courses, [assignedProgram, courses]);
  const teacherCourses = useMemo(() => assignedSubjectCodes.length > 0
    ? availableCourses.filter((option) => assignedSubjectCodes.includes(option.code.toLowerCase()))
    : availableCourses, [assignedSubjectCodes, availableCourses]);
  const nextAssignmentNumber = assignments.reduce((max, assignment) => Math.max(max, assignment.assignment_number || 10000), 10000) + 1;
  const filteredCourses = teacherCourses.filter((option) => option.program === program && option.semester === semester);
  const filteredGradeCourses = teacherCourses.filter((option) => option.program === gradeProgram && option.semester === gradeSemester);

  const compareValues = (first: string | number | boolean | null | undefined, second: string | number | boolean | null | undefined, direction: SortDirection) => {
    const firstValue = typeof first === "number" ? first : String(first ?? "").toLowerCase();
    const secondValue = typeof second === "number" ? second : String(second ?? "").toLowerCase();
    if (firstValue < secondValue) return direction === "asc" ? -1 : 1;
    if (firstValue > secondValue) return direction === "asc" ? 1 : -1;
    return 0;
  };

  const updateAssignmentSort = (key: string) => {
    setAssignmentSort((sort) => ({ key, direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc" }));
  };

  const updateSubmissionSort = (key: string) => {
    setSubmissionSort((sort) => ({ key, direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc" }));
  };

  const sortLabel = (sort: { key: string; direction: SortDirection }, key: string) => sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "";

  const loadAssignments = async () => {
    try {
      const data = await apiCall("/assignments/", "GET");
      setAssignments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSubmissions = async () => {
    try {
      const data = await apiCall("/submissions/", "GET");
      setSubmissions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadOptions = async () => {
    try {
      const [courseData, programData] = await Promise.all([
        apiCall("/courses/", "GET"),
        apiCall("/courses/programs/", "GET"),
      ]);
      setCourses(courseData);
      setPrograms(programData);
      const teacherProgram = user?.course || "";
      const fallbackProgram = teacherProgram || programData[0]?.name || courseData[0]?.program || "";
      setProgram((current) => teacherProgram || current || fallbackProgram);
      setGradeProgram((current) => teacherProgram || current || fallbackProgram);
    } catch (error) {
      console.error(error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalytics(await apiCall("/upgrades/analytics/teacher/", "GET"));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadSubmissions();
    loadOptions();
    loadAnalytics();
  }, []);

  useEffect(() => {
    const nextProgram = assignedProgram || program;
    if (assignedProgram && program !== assignedProgram) {
      setProgram(assignedProgram);
      return;
    }
    const matchingCourses = teacherCourses.filter((option) => option.program === nextProgram && option.semester === semester);
    setCourse((current) => matchingCourses.some((option) => option.code === current) ? current : matchingCourses[0]?.code || "");
  }, [assignedProgram, teacherCourses, program, semester]);

  useEffect(() => {
    const nextProgram = assignedProgram || gradeProgram;
    if (assignedProgram && gradeProgram !== assignedProgram) {
      setGradeProgram(assignedProgram);
      return;
    }
    const matchingCourses = teacherCourses.filter((option) => option.program === nextProgram && option.semester === gradeSemester);
    setGradeCourse((current) => matchingCourses.some((option) => option.code === current) ? current : matchingCourses[0]?.code || "");
  }, [assignedProgram, teacherCourses, gradeProgram, gradeSemester]);

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      address: user?.address || "",
      email_notifications_enabled: user?.email_notifications_enabled ?? true,
      deadline_reminders_enabled: user?.deadline_reminders_enabled ?? true,
    });
  }, [user]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!course || !program) {
      setMessageType("error");
      setMessage("Please ask admin to add a program and Course/Subject before creating an assignment.");
      return;
    }
    if (assignedProgram && program !== assignedProgram) {
      setMessageType("error");
      setMessage(`You can only create assignments for your assigned program: ${assignedProgram}.`);
      return;
    }
    setIsPublishing(true);
    setPublishProgress(0);

    const progressInterval = setInterval(() => {
      setPublishProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("course", course);
      formData.append("program", program);
      formData.append("semester", semester.toString());
      formData.append("due_date", `${dueDate}T23:59`);
      formData.append("total_points", totalPoints.toString());
      formData.append("allow_late_submission", String(allowLateSubmission));
      formData.append("late_submission_until", allowLateSubmission && lateSubmissionUntil ? lateSubmissionUntil : "");
      formData.append("late_penalty_points", latePenaltyPoints.toString());
      formData.append("late_submission_note", lateSubmissionNote);
      formData.append("status", assignmentStatus);
      formData.append("allow_resubmission", String(allowResubmission));
      formData.append("max_attempts", maxAttempts.toString());
      if (assignmentFile) {
        formData.append("assignment_file", assignmentFile);
      }

      await apiCall(editingAssignmentId ? `/assignments/${editingAssignmentId}/` : "/assignments/", editingAssignmentId ? "PATCH" : "POST", formData, true);
      setPublishProgress(100);
      setMessageType("success");
      setMessage(editingAssignmentId ? "Assignment updated successfully." : "Assignment created successfully.");
      resetAssignmentForm();
      loadAssignments();
      loadAnalytics();
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to create assignment. Please check all fields.");
    } finally {
      clearInterval(progressInterval);
      setIsPublishing(false);
    }
  };

  const resetAssignmentForm = () => {
    setEditingAssignmentId(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setTotalPoints(100);
    setAllowLateSubmission(false);
    setLateSubmissionUntil("");
    setLatePenaltyPoints(0);
    setLateSubmissionNote("");
    setAssignmentStatus("active");
    setAllowResubmission(true);
    setMaxAttempts(3);
    setAssignmentFile(null);
  };

  const editAssignment = (assignment: Assignment) => {
    setEditingAssignmentId(assignment.id);
    setTitle(assignment.title);
    setDescription(assignment.description);
    setCourse(assignment.course);
    setProgram(assignment.program);
    setSemester(assignment.semester);
    setDueDate(assignment.due_date.slice(0, 10));
    setTotalPoints(assignment.total_points);
    setAllowLateSubmission(assignment.allow_late_submission);
    setLateSubmissionUntil(assignment.late_submission_until ? assignment.late_submission_until.slice(0, 10) : "");
    setLatePenaltyPoints(assignment.late_penalty_points);
    setLateSubmissionNote(assignment.late_submission_note);
    setAssignmentStatus(assignment.status === "closed" ? "active" : assignment.status);
    setAllowResubmission(assignment.allow_resubmission);
    setMaxAttempts(assignment.max_attempts);
    setMessage("");
    setActiveSection("create");
  };

  const deleteAssignment = async (assignmentId: number) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }
    try {
      await apiCall(`/assignments/${assignmentId}/`, "DELETE");
      setMessageType("success");
      setMessage("Assignment deleted successfully.");
      loadAssignments();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to delete assignment.");
    }
  };

  const handleGrade = async (submissionId: number) => {
    setIsGrading(true);
    setGradeProgress(0);

    const progressInterval = setInterval(() => {
      setGradeProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      await apiCall(`/submissions/${submissionId}/`, "PATCH", {
        score: parseInt(score, 10),
        feedback,
      });
      setGradeProgress(100);
      setMessageType("success");
      setMessage("Submission graded successfully.");
      setGradingSubmission(null);
      setScore("");
      setFeedback("");
      loadSubmissions();
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to grade submission. Please make sure score is valid.");
    } finally {
      clearInterval(progressInterval);
      setIsGrading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const renderOverview = () => (
    <div className="workspace-panel">
      <h2>Instructor dashboard</h2>
      <p>Post new assignments, track active tasks, and keep classroom workflow organized.</p>
      <AnalyticsPanel data={analytics} />
      <NotificationCenter />
    </div>
  );

  const renderCreate = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <div>
          <h3>{editingAssignmentId ? "Edit assignment details" : "Create a new assignment"}</h3>
          <p>{editingAssignmentId ? "Update assignment details and keep the class list current." : "Add assignment details and publish them directly to your students."}</p>
        </div>
        <span className="badge">{assignments.length} published</span>
      </div>

      <form onSubmit={handleCreate} className="form-grid">
        <div className="form-group">
          <label htmlFor="assignmentNumber">Assignment Number</label>
          <input
            id="assignmentNumber"
            value={editingAssignmentId ? assignments.find((assignment) => assignment.id === editingAssignmentId)?.assignment_number || "" : nextAssignmentNumber}
            readOnly
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="program">Program</label>
            {assignedProgram ? (
              <input id="program" value={assignedProgram} readOnly />
            ) : (
              <select id="program" value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">{programs.length === 0 ? "No programs added by admin" : "Choose program"}</option>
                {availablePrograms.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="semester">Semester</label>
            <select id="semester" value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="course">Course/Subject</label>
            <select id="course" value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">
                {courses.length === 0 ? "No Course/Subject added by admin" : filteredCourses.length === 0 ? "No Course/Subject for selected program and semester" : "Choose Course/Subject"}
              </option>
              {filteredCourses.map((option) => (
                <option key={option.id} value={option.code}>
                  {option.code} - {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div className="form-group">
            <label htmlFor="totalPoints">Total Points</label>
            <input
              id="totalPoints"
              type="number"
              min={0}
              value={totalPoints}
              onChange={(e) => setTotalPoints(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="assignmentFile">Assignment File If Any</label>
          <input
            id="assignmentFile"
            type="file"
            onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
          />
          {editingAssignmentId && assignments.find((assignment) => assignment.id === editingAssignmentId)?.assignment_file && (
            <a className="file-link" href={assignments.find((assignment) => assignment.id === editingAssignmentId)?.assignment_file || "#"} target="_blank" rel="noreferrer">
              View current assignment file
            </a>
          )}
        </div>

        <div className="form-row">
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={allowLateSubmission}
              onChange={(e) => setAllowLateSubmission(e.target.checked)}
            />
            Allow late submission
          </label>
          <div className="form-group">
            <label htmlFor="lateSubmissionUntil">Late Submission Date</label>
            <input
              id="lateSubmissionUntil"
              type="date"
              value={lateSubmissionUntil}
              onChange={(e) => setLateSubmissionUntil(e.target.value)}
              disabled={!allowLateSubmission}
            />
          </div>
          <div className="form-group">
            <label htmlFor="latePenalty">Late Penalty Points</label>
            <input
              id="latePenalty"
              type="number"
              min={0}
              value={latePenaltyPoints}
              onChange={(e) => setLatePenaltyPoints(Number(e.target.value))}
              disabled={!allowLateSubmission}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="assignmentStatus">Assignment Status</label>
          <select id="assignmentStatus" value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value as Assignment["status"])}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="form-row">
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={allowResubmission}
              onChange={(e) => setAllowResubmission(e.target.checked)}
            />
            Allow resubmission
          </label>
          <div className="form-group">
            <label htmlFor="maxAttempts">Maximum Attempts</label>
            <input
              id="maxAttempts"
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              disabled={!allowResubmission}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="lateNote">Late Submission Note</label>
          <input
            id="lateNote"
            value={lateSubmissionNote}
            onChange={(e) => setLateSubmissionNote(e.target.value)}
            disabled={!allowLateSubmission}
            placeholder="Optional note for students"
          />
        </div>

        {message && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
        <button type="submit" disabled={isPublishing}>
          {isPublishing ? (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${publishProgress}%` }}></div>
              </div>
              <span className="progress-text">{publishProgress}%</span>
            </div>
          ) : (
            editingAssignmentId ? "Update assignment" : "Publish assignment"
          )}
        </button>
        {editingAssignmentId && <button type="button" className="secondary-button" onClick={resetAssignmentForm}>Cancel edit</button>}
      </form>
    </div>
  );

  const renderAssignments = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <div>
          <h3>Manage Assignment</h3>
        </div>
        <button type="button" className="compact-button" onClick={() => { resetAssignmentForm(); setActiveSection("create"); }}>
          + Add Assignment
        </button>
      </div>
      <div className="search-bar">
        <label htmlFor="assignmentSearch">Search assignment</label>
        <div className="search-action-row">
          <input
            id="assignmentSearch"
            type="search"
            value={assignmentSearch}
            onChange={(e) => { setAssignmentSearch(e.target.value); setAssignmentPage(1); }}
            placeholder="Search by number, title, program, or subject"
          />
          <button type="button" onClick={() => setAssignmentSearch(assignmentSearch.trim())}>Search</button>
        </div>
      </div>
      <div className="table-tools">
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("assignment_number")}>Assignment No. {sortLabel(assignmentSort, "assignment_number")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("program")}>Program {sortLabel(assignmentSort, "program")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("course")}>Subject {sortLabel(assignmentSort, "course")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("title")}>Title {sortLabel(assignmentSort, "title")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateAssignmentSort("due_date")}>Deadline {sortLabel(assignmentSort, "due_date")}</button>
      </div>
      {message && activeSection === "assignments" && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>S No.</th>
              <th>Assignment Number</th>
              <th>Course Name</th>
              <th>Subject</th>
              <th>Assignment Title</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>File</th>
              <th>Date of Creation</th>
              <th>Deadline</th>
              <th>Late Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssignments.map((assignment, index) => (
              <tr key={assignment.id}>
                <td>{(assignmentPage - 1) * pageSize + index + 1}</td>
                <td>{assignment.assignment_number}</td>
                <td>{assignment.program}</td>
                <td>{assignment.course}</td>
                <td>{assignment.title}</td>
                <td>{assignment.display_status || assignment.status}</td>
                <td>{assignment.allow_resubmission ? `Up to ${assignment.max_attempts}` : "No resubmission"}</td>
                <td><FilePreviewer fileUrl={assignment.assignment_file} label="Preview" /></td>
                <td>{formatDate(assignment.created_at)}</td>
                <td>{formatDateOnly(assignment.due_date)}</td>
                <td>{assignment.late_submission_until ? formatDateOnly(assignment.late_submission_until) : "-"}</td>
                <td>
                  <div className="action-buttons">
                    <button type="button" className="compact-button" onClick={() => editAssignment(assignment)}>
                      Edit Details
                    </button>
                    <button type="button" className="secondary-button compact-button" onClick={() => setDiscussionAssignmentId(discussionAssignmentId === assignment.id ? null : assignment.id)}>
                      Discussion
                    </button>
                    <button type="button" className="danger-button compact-button" onClick={() => deleteAssignment(assignment.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAssignments.length === 0 && (
              <tr>
                <td colSpan={12}>{assignments.length === 0 ? "No assignments added yet." : "No assignments match your search."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {discussionAssignmentId && <AssignmentDiscussion assignmentId={discussionAssignmentId} />}
      <Pagination page={assignmentPage} pageSize={pageSize} total={filteredAssignments.length} onPageChange={setAssignmentPage} />
    </div>
  );

  const renderSubmissions = () => (
    <div className="workspace-panel">
      <div className="section-heading">
        <div>
          <h3>Grade submissions</h3>
          <p>Select program, semester, and Course/Subject to view submitted assignments.</p>
        </div>
        <span className="badge">{filteredSubmissions.length} shown</span>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="gradeProgram">Program</label>
          <select id="gradeProgram" value={gradeProgram} onChange={(e) => setGradeProgram(e.target.value)} disabled={Boolean(assignedProgram)}>
            <option value="">{programs.length === 0 ? "No programs added by admin" : "Choose program"}</option>
            {availablePrograms.map((option) => (
              <option key={option.id} value={option.name}>{option.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="gradeSemester">Semester</label>
          <select id="gradeSemester" value={gradeSemester} onChange={(e) => setGradeSemester(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="gradeCourse">Course/Subject</label>
        <select id="gradeCourse" value={gradeCourse} onChange={(e) => setGradeCourse(e.target.value)}>
          <option value="">
            {courses.length === 0 ? "No Course/Subject added by admin" : filteredGradeCourses.length === 0 ? "No Course/Subject for selected program and semester" : "Choose Course/Subject"}
          </option>
          {filteredGradeCourses.map((option) => (
            <option key={option.id} value={option.code}>
              {option.code} - {option.name}
            </option>
          ))}
        </select>
      </div>
      <div className="search-bar">
        <label htmlFor="studentSearch">Search student</label>
        <input
          id="studentSearch"
          type="search"
          value={studentSearch}
          onChange={(e) => { setStudentSearch(e.target.value); setSubmissionPage(1); }}
          placeholder="Type a student enrollment number or name"
        />
      </div>
      <div className="table-tools filter-tools">
        <select value={submissionStatusFilter} onChange={(e) => { setSubmissionStatusFilter(e.target.value); setSubmissionPage(1); }}>
          <option value="all">All results</option>
          <option value="pending">Pending</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="late">Late</option>
          <option value="on-time">On time</option>
        </select>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("student")}>Student {sortLabel(submissionSort, "student")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("submitted_at")}>Submitted {sortLabel(submissionSort, "submitted_at")}</button>
        <button type="button" className="secondary-button compact-button" onClick={() => updateSubmissionSort("score")}>Score {sortLabel(submissionSort, "score")}</button>
      </div>
      {message && activeSection === "submissions" && <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>}
      {filteredSubmissions.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <div className="content-list">
          {paginatedSubmissions.map((submission) => {
            const hasScore = submission.score != null;
            const passed = hasScore && submission.score! >= 40;
            return (
            <div key={submission.id} className={`submission-card ${hasScore ? passed ? "submission-pass" : "submission-fail" : ""}`}>
              <div className="card-title-row">
                <h3>{submission.assignment_title}</h3>
                <button className="compact-button" onClick={() => setGradingSubmission(submission.id)}>Edit</button>
              </div>
              <div className="assignment-meta">
                <span>Student: {submission.student_full_name || submission.student}</span>
                <span>Enrollment: {submission.student}</span>
                <span>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</span>
                <span>{submission.is_late ? "Late" : "On time"}</span>
                {submission.score != null && <span>Score: {submission.score}</span>}
              </div>
              <p>Comment: {submission.comment || "None"}</p>
              <FilePreviewer fileUrl={submission.uploaded_file} label="Submitted file" />
              {submission.feedback && <p>Feedback: {submission.feedback}</p>}
              {gradingSubmission === submission.id ? (
                <form onSubmit={(e) => { e.preventDefault(); handleGrade(submission.id); }} className="form-grid">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Score</label>
                      <input type="number" value={score} onChange={(e) => setScore(e.target.value)} min={0} max={100} required />
                    </div>
                    <div className="form-group">
                      <label>Feedback</label>
                      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
                    </div>
                  </div>
                  <div className="button-row">
                    <button type="submit" disabled={isGrading && gradingSubmission === submission.id}>
                      {isGrading && gradingSubmission === submission.id ? (
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${gradeProgress}%` }}></div>
                          </div>
                          <span className="progress-text">{gradeProgress}%</span>
                        </div>
                      ) : (
                        "Submit Grade"
                      )}
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setGradingSubmission(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="grade-action-row">
                  <button onClick={() => setGradingSubmission(submission.id)}>Grade</button>
                  {hasScore && (
                    <span className={`result-badge ${passed ? "result-pass" : "result-fail"}`}>
                      {passed ? "Pass" : "Fail"}
                    </span>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      <Pagination page={submissionPage} pageSize={pageSize} total={filteredSubmissions.length} onPageChange={setSubmissionPage} />
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
          <div className="form-group">
            <label htmlFor="teacherUsername">Username</label>
            <input
              id="teacherUsername"
              value={profileForm.username}
              onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="teacherAddress">Address</label>
            <textarea
              id="teacherAddress"
              rows={3}
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
            />
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
                username: user?.username || "",
                address: user?.address || "",
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
        <div><span>Username</span><strong>{user?.username || "-"}</strong></div>
        <div><span>Email</span><strong>{user?.email || "-"}</strong></div>
        <div><span>Name</span><strong>{`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "-"}</strong></div>
        <div><span>Role</span><strong>{user?.role || "-"}</strong></div>
        <div><span>Teacher ID</span><strong>{user?.teacher_id || "-"}</strong></div>
        <div><span>Course/Subject</span><strong>{user?.course || "-"}</strong></div>
        <div><span>Mobile</span><strong>{user?.mobile_number || "-"}</strong></div>
        <div><span>Gender</span><strong>{user?.gender || "-"}</strong></div>
        <div><span>Date of Birth</span><strong>{user?.date_of_birth || "-"}</strong></div>
        <div><span>Religion</span><strong>{user?.religion || "-"}</strong></div>
        <div className="profile-wide"><span>Address</span><strong>{user?.address || "-"}</strong></div>
      </div>
    </div>
  );

  const renderPassword = () => (
    <div className="workspace-panel">
      <h3>Change Password</h3>
      <form onSubmit={handlePasswordChange} className="form-grid">
        <div className="form-group">
          <label htmlFor="teacherPassword">New Password</label>
          <input
            id="teacherPassword"
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="teacherConfirmPassword">Confirm Password</label>
          <input
            id="teacherConfirmPassword"
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

  const filteredSubmissions = submissions.filter((submission) => {
    const assignment = assignments.find((item) => item.id === submission.assignment);
    if (!assignment || !gradeProgram || !gradeCourse) {
      return false;
    }
    const matchesClass =
      assignment.program === gradeProgram &&
      assignment.semester === gradeSemester &&
      assignment.course === gradeCourse;
    const search = studentSearch.trim().toLowerCase();
    const matchesStudent =
      !search ||
      submission.student.toLowerCase().includes(search) ||
      (submission.student_full_name || "").toLowerCase().includes(search);
    const hasScore = submission.score != null;
    const passed = hasScore && submission.score! >= 40;
    const matchesStatus =
      submissionStatusFilter === "all" ||
      (submissionStatusFilter === "pending" && !hasScore) ||
      (submissionStatusFilter === "pass" && passed) ||
      (submissionStatusFilter === "fail" && hasScore && !passed) ||
      (submissionStatusFilter === "late" && submission.is_late) ||
      (submissionStatusFilter === "on-time" && !submission.is_late);
    return matchesClass && matchesStudent && matchesStatus;
  }).sort((first, second) => {
    const getValue = (submission: Submission) => {
      if (submissionSort.key === "submitted_at") return submission.submitted_at;
      if (submissionSort.key === "score") return submission.score ?? -1;
      return submission.student_full_name || submission.student;
    };
    return compareValues(getValue(first), getValue(second), submissionSort.direction);
  });
  const paginatedSubmissions = filteredSubmissions.slice((submissionPage - 1) * pageSize, submissionPage * pageSize);

  const filteredAssignments = assignments
    .filter((assignment) => {
      const search = assignmentSearch.trim().toLowerCase();
      if (!search) {
        return true;
      }
      return (
        String(assignment.assignment_number).includes(search) ||
        assignment.title.toLowerCase().includes(search) ||
        assignment.program.toLowerCase().includes(search) ||
        assignment.course.toLowerCase().includes(search)
      );
    })
    .sort((first, second) => {
      const getValue = (assignment: Assignment) => {
        if (assignmentSort.key === "program") return assignment.program;
        if (assignmentSort.key === "course") return assignment.course;
        if (assignmentSort.key === "title") return assignment.title;
        if (assignmentSort.key === "due_date") return assignment.due_date;
        return assignment.assignment_number;
      };
      return compareValues(getValue(first), getValue(second), assignmentSort.direction);
    });
  const paginatedAssignments = filteredAssignments.slice((assignmentPage - 1) * pageSize, assignmentPage * pageSize);

  const sectionContent = {
    overview: renderOverview,
    assignments: renderAssignments,
    create: renderCreate,
    submissions: renderSubmissions,
    profile: renderProfile,
    password: renderPassword,
  };

  return (
    <div className="workspace-layout">
      <aside className="side-menu">
        <div className="side-menu-heading">
          <h2>Teacher</h2>
          <p>Classroom workspace</p>
        </div>
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")}>Overview</button>
        <button className={activeSection === "assignments" ? "active" : ""} onClick={() => setActiveSection("assignments")}>Assignment</button>
        <button className={activeSection === "create" ? "active" : ""} onClick={() => setActiveSection("create")}>Create Assignment</button>
        <button className={activeSection === "submissions" ? "active" : ""} onClick={() => setActiveSection("submissions")}>Grade Submissions</button>
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

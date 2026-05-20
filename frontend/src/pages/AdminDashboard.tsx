import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, downloadApiFile } from "../services/api";
import { Assignment, AuditLog, Course, Program, User } from "../types";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateOnly } from "../utils/date";
import AnalyticsPanel from "../components/AnalyticsPanel";
import NotificationCenter from "../components/NotificationCenter";
import ReportsPanel from "../components/ReportsPanel";
import Pagination from "../components/Pagination";

const defaultPrograms = ["BCA", "BBA", "B.Tech", "MCA", "MBA", "M.Tech"];
const pageSize = 8;

type AdminSection = "overview" | "assignments" | "programs" | "teachers" | "students" | "courses" | "audit" | "profile" | "password";
type SortDirection = "asc" | "desc";
type CsvPreview = {
  headers: string[];
  rows: Array<{ row: number; status: string; data: Record<string, string>; errors: string[] }>;
  total_rows: number;
  valid_rows: number;
  errors: Array<{ row: number; error: string }>;
};
type DeletedRecord = {
  type: "user" | "assignment" | "course" | "program";
  id: number;
  name: string;
  details: string | number;
  deleted_at: string | null;
};

export default function AdminDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [analytics, setAnalytics] = useState({});
  const [studentImportFile, setStudentImportFile] = useState<File | null>(null);
  const [teacherImportFile, setTeacherImportFile] = useState<File | null>(null);
  const [studentImportPreview, setStudentImportPreview] = useState<CsvPreview | null>(null);
  const [teacherImportPreview, setTeacherImportPreview] = useState<CsvPreview | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    date_from: "",
    date_to: "",
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [adminSearch, setAdminSearch] = useState({
    assignments: "",
    programs: "",
    courses: "",
    teachers: "",
    students: "",
  });
  const [adminSort, setAdminSort] = useState<Record<"assignments" | "programs" | "courses" | "teachers" | "students", { key: string; direction: SortDirection }>>({
    assignments: { key: "assignment_number", direction: "asc" },
    programs: { key: "name", direction: "asc" },
    courses: { key: "code", direction: "asc" },
    teachers: { key: "teacher_id", direction: "asc" },
    students: { key: "username", direction: "asc" },
  });
  const [adminPage, setAdminPage] = useState<Record<"assignments" | "programs" | "courses" | "teachers" | "students", number>>({
    assignments: 1,
    programs: 1,
    courses: 1,
    teachers: 1,
    students: 1,
  });
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "student",
    course: "BCA",
    semester: 1,
    teacher_id: "",
    mobile_number: "",
    gender: "Male",
    date_of_birth: "",
    religion: "",
    address: "",
    assigned_subjects: "",
  });
  const [teacherDraft, setTeacherDraft] = useState<typeof userForm | null>(null);
  const [studentDraft, setStudentDraft] = useState<typeof userForm | null>(null);
  const [courseForm, setCourseForm] = useState({
    code: "",
    name: "",
    program: "BCA",
    semester: 1,
  });
  const [programForm, setProgramForm] = useState({
    name: "",
  });
  const [accountForm, setAccountForm] = useState({
    username: user?.username || "",
    password: "",
    confirmPassword: "",
  });
  const [adminProfileForm, setAdminProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    address: user?.address || "",
  });

  const programOptions = programs.length > 0 ? programs.map((program) => program.name) : defaultPrograms;

  const updateSearch = (section: keyof typeof adminSearch, value: string) => {
    setAdminSearch((search) => ({ ...search, [section]: value }));
    setAdminPage((pages) => ({ ...pages, [section]: 1 }));
  };

  const updateSort = (section: keyof typeof adminSort, key: string) => {
    setAdminSort((sorts) => ({
      ...sorts,
      [section]: {
        key,
        direction: sorts[section].key === key && sorts[section].direction === "asc" ? "desc" : "asc",
      },
    }));
  };

  const paginate = <T,>(items: T[], section: keyof typeof adminPage) => {
    const start = (adminPage[section] - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const compareValues = (first: string | number | null | undefined, second: string | number | null | undefined, direction: SortDirection) => {
    const firstValue = typeof first === "number" ? first : String(first ?? "").toLowerCase();
    const secondValue = typeof second === "number" ? second : String(second ?? "").toLowerCase();
    if (firstValue < secondValue) {
      return direction === "asc" ? -1 : 1;
    }
    if (firstValue > secondValue) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  };

  const renderSortButton = (section: keyof typeof adminSort, key: string, label: string) => (
    <button type="button" className="secondary-button compact-button" onClick={() => updateSort(section, key)}>
      {label} {adminSort[section].key === key ? (adminSort[section].direction === "asc" ? "↑" : "↓") : ""}
    </button>
  );

  const matchesSearch = (search: string, values: Array<string | number | null | undefined>) => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return values.some((value) => String(value ?? "").toLowerCase().includes(query));
  };

  const getNextTeacherId = (sourceUsers: User[] = users) => {
    const maxId = sourceUsers.reduce((max, user) => {
      const match = user.teacher_id?.match(/^T(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `T${String(maxId + 1).padStart(3, "0")}`;
  };

  const getNextEnrollmentNumber = (sourceUsers: User[] = users) => {
    const maxEnrollment = sourceUsers.reduce((max, user) => {
      if (user.role !== "student") {
        return max;
      }
      const number = Number(user.username);
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 1000000000);
    return String(maxEnrollment + 1);
  };

  const getDefaultTeacherForm = (sourceUsers: User[] = users) => ({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "teacher",
    course: "BCA",
    semester: 1,
    teacher_id: getNextTeacherId(sourceUsers),
    mobile_number: "",
    gender: "Male",
    date_of_birth: "",
    religion: "",
    address: "",
    assigned_subjects: "",
  });

  const getDefaultStudentForm = (sourceUsers: User[] = users) => ({
    username: getNextEnrollmentNumber(sourceUsers),
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "student",
    course: "BCA",
    semester: 1,
    teacher_id: "",
    mobile_number: "",
    gender: "Male",
    date_of_birth: "",
    religion: "",
    address: "",
    assigned_subjects: "",
  });

  const keepCurrentUserDraft = () => {
    if (activeSection === "teachers") {
      setTeacherDraft(userForm);
    }
    if (activeSection === "students") {
      setStudentDraft(userForm);
    }
  };

  const changeSection = (section: AdminSection) => {
    keepCurrentUserDraft();
    setEditingUserId(null);
    setMessage("");
    setActiveSection(section);
  };

  const openUserSection = (section: "teachers" | "students") => {
    keepCurrentUserDraft();
    setEditingUserId(null);
    setMessage("");
    setActiveSection(section);
    setUserForm(section === "teachers" ? teacherDraft ?? getDefaultTeacherForm() : studentDraft ?? getDefaultStudentForm());
  };

  const loadAdminData = async () => {
    try {
      const [userData, assignmentData, courseData, programData, analyticsData, auditData] = await Promise.all([
        apiCall("/users/admin/users/", "GET"),
        apiCall("/assignments/", "GET"),
        apiCall("/courses/", "GET"),
        apiCall("/courses/programs/", "GET"),
        apiCall("/upgrades/analytics/admin/", "GET"),
        apiCall("/upgrades/audit/", "GET"),
      ]);
      setUsers(userData);
      setAssignments(assignmentData);
      setCourses(courseData);
      setPrograms(programData);
      setAnalytics(analyticsData);
      setAuditLogs(auditData);
      return { users: userData as User[] };
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to load admin data.");
      return null;
    }
  };

  const loadAuditLogs = async (search = auditSearch) => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (auditFilters.action) params.set("action", auditFilters.action);
      if (auditFilters.date_from) params.set("date_from", auditFilters.date_from);
      if (auditFilters.date_to) params.set("date_to", auditFilters.date_to);
      const query = params.toString() ? `?${params.toString()}` : "";
      setAuditLogs(await apiCall(`/upgrades/audit/${query}`, "GET"));
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to load audit logs.");
    }
  };

  const loadDeletedRecords = async () => {
    try {
      setDeletedRecords(await apiCall("/upgrades/deleted-records/", "GET"));
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to load deleted records.");
    }
  };

  const restoreDeletedRecord = async (record: DeletedRecord) => {
    if (!window.confirm(`Restore this ${record.type}?`)) {
      return;
    }
    try {
      await apiCall("/upgrades/deleted-records/restore/", "POST", {
        type: record.type,
        id: record.id,
      });
      setMessageType("success");
      setMessage("Record restored successfully.");
      loadDeletedRecords();
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to restore record.");
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    setAccountForm((form) => ({ ...form, username: user?.username || "" }));
    setAdminProfileForm({
      username: user?.username || "",
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      address: user?.address || "",
    });
  }, [user]);

  useEffect(() => {
    if (activeSection === "teachers" && !editingUserId && userForm.role === "teacher" && !userForm.teacher_id) {
      setUserForm((form) => ({ ...form, teacher_id: getNextTeacherId() }));
    }
  }, [activeSection, editingUserId, userForm.role, userForm.teacher_id, users]);

  useEffect(() => {
    if (activeSection === "students" && !editingUserId && userForm.role === "student" && !userForm.username) {
      setUserForm((form) => ({ ...form, username: getNextEnrollmentNumber() }));
    }
  }, [activeSection, editingUserId, userForm.role, userForm.username, users]);

  const resetUserForm = () => {
    setEditingUserId(null);
    if (activeSection === "students") {
      const nextStudentForm = getDefaultStudentForm();
      setStudentDraft(null);
      setUserForm(nextStudentForm);
      return;
    }
    const nextTeacherForm = getDefaultTeacherForm();
    setTeacherDraft(null);
    setUserForm(nextTeacherForm);
  };

  const saveUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...userForm,
        teacher_id: userForm.role === "teacher" ? userForm.teacher_id : "",
        course: userForm.role === "student" || userForm.role === "teacher" ? userForm.course : "",
        semester: userForm.role === "student" ? userForm.semester : null,
        mobile_number: userForm.role === "teacher" || userForm.role === "student" ? userForm.mobile_number : "",
        gender: userForm.role === "teacher" ? userForm.gender : "",
        date_of_birth: userForm.role === "teacher" ? userForm.date_of_birth : null,
        religion: userForm.role === "teacher" ? userForm.religion : "",
        address: userForm.role === "teacher" ? userForm.address : "",
        assigned_subjects: userForm.role === "teacher" ? userForm.assigned_subjects : "",
      };
      if (!payload.password) {
        delete (payload as Partial<typeof payload>).password;
      }
      const savedUser = await apiCall(
        editingUserId ? `/users/admin/users/${editingUserId}/` : "/users/admin/users/",
        editingUserId ? "PATCH" : "POST",
        payload
      );
      setMessageType("success");
      setMessage(
        savedUser.email_warning ||
          (editingUserId
            ? "User updated successfully."
            : userForm.role === "student"
              ? savedUser.email_sent
                ? "Student registered successfully. Enrollment email sent."
                : "Student registered successfully, but no enrollment email was sent."
              : savedUser.email_sent
                ? "User created successfully. Email sent."
                : "User created successfully, but no email was sent.")
      );
      if (!editingUserId && userForm.role === "student") {
        const nextEnrollment = Number(savedUser.username);
        setStudentDraft(null);
        setEditingUserId(null);
        setUserForm({ ...getDefaultStudentForm(), username: Number.isFinite(nextEnrollment) ? String(nextEnrollment + 1) : getNextEnrollmentNumber() });
      } else if (!editingUserId && userForm.role === "teacher") {
        const match = savedUser.teacher_id?.match(/^T(\d+)$/i);
        const nextTeacherNumber = match ? Number(match[1]) + 1 : null;
        setTeacherDraft(null);
        setEditingUserId(null);
        setUserForm({ ...getDefaultTeacherForm(), teacher_id: nextTeacherNumber ? `T${String(nextTeacherNumber).padStart(3, "0")}` : getNextTeacherId() });
      } else {
        resetUserForm();
      }
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      if (!editingUserId && error instanceof TypeError && error.message === "Failed to fetch") {
        await loadAdminData();
        setMessage("Unable to confirm registration response. Refresh the page before trying again so you do not create a duplicate.");
      } else {
        setMessage(error instanceof Error ? error.message : "Unable to save user.");
      }
    }
  };

  const editUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      email: user.email || "",
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role,
      course: user.course || "BCA",
      semester: user.semester || 1,
      teacher_id: user.teacher_id || "",
      mobile_number: user.mobile_number || "",
      gender: user.gender || "Male",
      date_of_birth: user.date_of_birth || "",
      religion: user.religion || "",
      address: user.address || "",
      assigned_subjects: user.assigned_subjects || "",
    });
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    try {
      await apiCall(`/users/admin/users/${userId}/`, "DELETE");
      setMessageType("success");
      setMessage("User removed.");
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to remove user.");
    }
  };

  const resetCourseForm = () => {
    setEditingCourseId(null);
    setCourseForm({
      code: "",
      name: "",
      program: "BCA",
      semester: 1,
    });
  };

  const saveCourse = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiCall(editingCourseId ? `/courses/${editingCourseId}/` : "/courses/", editingCourseId ? "PATCH" : "POST", {
        ...courseForm,
        description: "",
      });
      setMessageType("success");
      setMessage(editingCourseId ? "Course/Subject updated successfully." : "Course/Subject created successfully.");
      resetCourseForm();
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to save Course/Subject.");
    }
  };

  const editCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      code: course.code,
      name: course.name,
      program: course.program,
      semester: course.semester,
    });
  };

  const deleteCourse = async (courseId: number) => {
    if (!window.confirm("Are you sure you want to delete this Course/Subject?")) {
      return;
    }
    try {
      await apiCall(`/courses/${courseId}/`, "DELETE");
      setMessageType("success");
      setMessage("Course/Subject removed.");
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to remove Course/Subject.");
    }
  };

  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgramForm({ name: "" });
  };

  const saveProgram = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiCall(editingProgramId ? `/courses/programs/${editingProgramId}/` : "/courses/programs/", editingProgramId ? "PATCH" : "POST", {
        ...programForm,
        description: "",
      });
      setMessageType("success");
      setMessage(editingProgramId ? "Program updated successfully." : "Program created successfully.");
      resetProgramForm();
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to save program.");
    }
  };

  const editProgram = (program: Program) => {
    setEditingProgramId(program.id);
    setProgramForm({ name: program.name });
  };

  const deleteProgram = async (programId: number) => {
    if (!window.confirm("Are you sure you want to delete this program?")) {
      return;
    }
    try {
      await apiCall(`/courses/programs/${programId}/`, "DELETE");
      setMessageType("success");
      setMessage("Program removed.");
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to remove program.");
    }
  };

  const deleteAssignment = async (assignmentId: number) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }
    try {
      await apiCall(`/assignments/${assignmentId}/`, "DELETE");
      setMessageType("success");
      setMessage("Assignment removed.");
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to remove assignment.");
    }
  };

  const importUsers = async (role: "students" | "teachers") => {
    const file = role === "students" ? studentImportFile : teacherImportFile;
    if (!file) {
      setMessageType("error");
      setMessage("Please choose a CSV file first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiCall(`/upgrades/imports/${role}/`, "POST", formData, true);
      setMessageType("success");
      setMessage(`Import complete. Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`);
      setStudentImportFile(null);
      setTeacherImportFile(null);
      setStudentImportPreview(null);
      setTeacherImportPreview(null);
      const loaded = await loadAdminData();
      const latestUsers = loaded?.users || users;
      if (!editingUserId) {
        if (role === "students") {
          setStudentDraft(null);
          setUserForm(getDefaultStudentForm(latestUsers));
        } else {
          setTeacherDraft(null);
          setUserForm(getDefaultTeacherForm(latestUsers));
        }
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to import CSV.");
    }
  };

  const previewImport = async (role: "students" | "teachers") => {
    const file = role === "students" ? studentImportFile : teacherImportFile;
    if (!file) {
      setMessageType("error");
      setMessage("Please choose a CSV file first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiCall(`/upgrades/imports/${role}/?preview=true`, "POST", formData, true);
      if (role === "students") {
        setStudentImportPreview(result);
      } else {
        setTeacherImportPreview(result);
      }
      setMessageType(result.errors.length ? "error" : "success");
      setMessage(`Preview complete. Valid rows: ${result.valid_rows}/${result.total_rows}. Errors: ${result.errors.length}.`);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to preview CSV.");
    }
  };

  const updateAdminProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessageType("error");
      setMessage("Unable to identify the current admin user.");
      return;
    }
    try {
      const updatedUser = await apiCall(`/users/admin/users/${user.id}/`, "PATCH", adminProfileForm);
      updateUser(updatedUser);
      setIsEditingAdminProfile(false);
      setMessageType("success");
      setMessage("Admin profile updated successfully.");
      loadAdminData();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to update admin profile.");
    }
  };

  const updateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessageType("error");
      setMessage("Unable to identify the current admin user.");
      return;
    }
    const nextUsername = accountForm.username.trim();
    const passwordChanged = Boolean(accountForm.password);
    const usernameChanged = nextUsername && nextUsername !== user.username;
    if (!nextUsername) {
      setMessageType("error");
      setMessage("Username cannot be empty.");
      return;
    }
    if (!usernameChanged && !passwordChanged) {
      setMessageType("error");
      setMessage("Please change the username or enter a new password.");
      return;
    }
    if (passwordChanged && accountForm.password !== accountForm.confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match.");
      return;
    }
    if (!window.confirm(passwordChanged ? "Are you sure you want to update this account? You will be logged out if the password changes." : "Are you sure you want to change your username?")) {
      return;
    }
    try {
      const payload: { username: string; password?: string } = { username: nextUsername };
      if (passwordChanged) {
        payload.password = accountForm.password;
      }
      const updatedUser = await apiCall(`/users/admin/users/${user.id}/`, "PATCH", payload);
      setAccountForm({ username: updatedUser.username, password: "", confirmPassword: "" });
      setMessageType("success");
      setMessage(usernameChanged && passwordChanged ? "Username and password updated successfully." : usernameChanged ? "Username updated successfully." : "Password changed successfully.");
      if (passwordChanged) {
        window.alert("Account updated successfully. Please login again.");
        logout();
        navigate("/");
        return;
      }
      updateUser(updatedUser);
      loadAdminData();
    } catch (error) {
      if (passwordChanged && error instanceof TypeError && error.message === "Failed to fetch") {
        window.alert("Account updated successfully. Please login again.");
        logout();
        navigate("/");
        return;
      }
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to update account. Make sure the username is unique.");
    }
  };

  const handleLogout = () => {
    setTeacherDraft(null);
    setStudentDraft(null);
    setUserForm({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role: "student",
      course: "BCA",
      semester: 1,
      teacher_id: "",
      mobile_number: "",
      gender: "Male",
      date_of_birth: "",
      religion: "",
      address: "",
      assigned_subjects: "",
    });
    logout();
    navigate("/");
  };

  const statusMessage = message ? (
    <div className={`alert ${messageType === "error" ? "alert-error" : "alert-success"}`}>{message}</div>
  ) : null;

  const renderOverview = () => (
    <section className="admin-panel">
      <h2>Admin Dashboard</h2>
      <p>Manage teachers, students, programs, and course/subjects from one place.</p>
      <AnalyticsPanel data={analytics} />
      <ReportsPanel />
      <NotificationCenter />
      <div className="audit-panel">
        <h3>Recent Admin Activity</h3>
        {auditLogs.length === 0 ? (
          <p>No activity recorded yet.</p>
        ) : (
          <div className="audit-list">
            {auditLogs.slice(0, 8).map((log) => (
              <div className="audit-item" key={log.id}>
                <strong>{log.action} {log.target_type}</strong>
                <span>{log.details || log.target_id}</span>
                <small>{log.actor} - {formatDate(log.created_at)}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const renderAssignments = () => {
    const assignmentSort = adminSort.assignments;
    const sortedAssignments = [...assignments]
      .filter((assignment) => {
        const teacher = users.find((user) => user.role === "teacher" && user.username === assignment.created_by);
        return matchesSearch(adminSearch.assignments, [
          assignment.assignment_number,
          assignment.created_by,
          teacher?.teacher_id,
          assignment.program,
          assignment.course,
          assignment.title,
          formatDate(assignment.created_at),
          formatDateOnly(assignment.due_date),
        ]);
      })
      .sort((first, second) => {
        const firstTeacher = users.find((user) => user.role === "teacher" && user.username === first.created_by);
        const secondTeacher = users.find((user) => user.role === "teacher" && user.username === second.created_by);
        const getValue = (assignment: Assignment, teacher?: User) => {
          if (assignmentSort.key === "teacher_id") return teacher?.teacher_id;
          if (assignmentSort.key === "created_by") return assignment.created_by;
          if (assignmentSort.key === "program") return assignment.program;
          if (assignmentSort.key === "course") return assignment.course;
          if (assignmentSort.key === "title") return assignment.title;
          if (assignmentSort.key === "due_date") return assignment.due_date;
          return assignment.assignment_number;
        };
        const result = compareValues(getValue(first, firstTeacher), getValue(second, secondTeacher), assignmentSort.direction);
        if (result !== 0) {
          return result;
        }
        return first.created_by.localeCompare(second.created_by);
      });
    const visibleAssignments = paginate(sortedAssignments, "assignments");

    return (
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Manage Assignment</h2>
          <span className="badge">{assignments.length} assignments</span>
        </div>
        {statusMessage}
        <div className="search-bar">
          <label htmlFor="adminAssignmentSearch">Search assignment</label>
          <div className="search-action-row">
            <input
              id="adminAssignmentSearch"
              type="search"
              value={adminSearch.assignments}
              onChange={(e) => updateSearch("assignments", e.target.value)}
              placeholder="Search by number, teacher, teacher ID, program, subject, or title"
            />
            <button type="button" onClick={() => updateSearch("assignments", adminSearch.assignments.trim())}>Search</button>
          </div>
        </div>
        <div className="table-tools">
          {renderSortButton("assignments", "assignment_number", "Assignment No.")}
          {renderSortButton("assignments", "created_by", "Teacher")}
          {renderSortButton("assignments", "teacher_id", "Teacher ID")}
          {renderSortButton("assignments", "program", "Program")}
          {renderSortButton("assignments", "course", "Subject")}
          {renderSortButton("assignments", "due_date", "Deadline")}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Assignment Number</th>
                <th>Teacher</th>
                <th>Teacher ID</th>
                <th>Program</th>
                <th>Subject</th>
                <th>Assignment Title</th>
                <th>Status</th>
                <th>Date of Creation</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleAssignments.map((assignment, index) => {
                const teacher = users.find((user) => user.role === "teacher" && user.username === assignment.created_by);
                return (
                  <tr key={assignment.id}>
                    <td>{(adminPage.assignments - 1) * pageSize + index + 1}</td>
                    <td>{assignment.assignment_number}</td>
                    <td>{assignment.created_by}</td>
                    <td>{teacher?.teacher_id || "-"}</td>
                    <td>{assignment.program}</td>
                    <td>{assignment.course}</td>
                    <td>{assignment.title}</td>
                    <td>{assignment.display_status || assignment.status}</td>
                    <td>{formatDate(assignment.created_at)}</td>
                    <td>{formatDateOnly(assignment.due_date)}</td>
                    <td>
                      <button className="danger-button compact-button" onClick={() => deleteAssignment(assignment.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {sortedAssignments.length === 0 && (
                <tr>
                  <td colSpan={11}>No assignments added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={adminPage.assignments} pageSize={pageSize} total={sortedAssignments.length} onPageChange={(page) => setAdminPage((pages) => ({ ...pages, assignments: page }))} />
      </section>
    );
  };

  const renderUsers = (mode: "teachers" | "students") => {
    const isTeacherMode = mode === "teachers";
    const searchKey = isTeacherMode ? "teachers" : "students";
    const sortState = adminSort[searchKey];
    const visibleUsers = users.filter((user) => {
      const matchesRole = isTeacherMode ? user.role === "teacher" || user.role === "admin" : user.role === "student";
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      const matchesUserSearch = matchesSearch(adminSearch[searchKey], [
        user.teacher_id,
        user.username,
        fullName,
        user.email,
        user.mobile_number,
        user.course,
        user.role,
      ]);
      return matchesRole && matchesUserSearch;
    }).sort((first, second) => {
      const getName = (item: User) => `${item.first_name || ""} ${item.last_name || ""}`.trim() || item.username;
      const getValue = (item: User) => {
        if (sortState.key === "name") return getName(item);
        if (sortState.key === "email") return item.email;
        if (sortState.key === "mobile") return item.mobile_number;
        if (sortState.key === "program") return item.course;
        if (sortState.key === "teacher_id") return item.teacher_id;
        return item.username;
      };
      return compareValues(getValue(first), getValue(second), sortState.direction);
    });
    const paginatedUsers = paginate(visibleUsers, searchKey);
    const importPreview = isTeacherMode ? teacherImportPreview : studentImportPreview;

    return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>{isTeacherMode ? "Manage Teachers" : "Register Student"}</h2>
        <span className="badge">{visibleUsers.length} {isTeacherMode ? "teachers" : "students"}</span>
      </div>
      {statusMessage}
      <div className="import-box">
        <div>
          <strong>{isTeacherMode ? "Import teachers by CSV" : "Import students by CSV"}</strong>
          <p>{isTeacherMode ? "Columns: username,email,password,teacher_id,first_name,last_name,mobile_number,program" : "Columns: enrollment_number,email,phone_number,program"}</p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (isTeacherMode) {
              setTeacherImportFile(e.target.files?.[0] || null);
              setTeacherImportPreview(null);
            } else {
              setStudentImportFile(e.target.files?.[0] || null);
              setStudentImportPreview(null);
            }
          }}
        />
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => downloadApiFile(`/upgrades/imports/${isTeacherMode ? "teachers" : "students"}/template/`, isTeacherMode ? "teachers_import_template.csv" : "students_import_template.csv")}
        >
          Download Template
        </button>
        <button type="button" className="secondary-button compact-button" onClick={() => previewImport(isTeacherMode ? "teachers" : "students")}>Preview CSV</button>
        <button type="button" className="compact-button" onClick={() => importUsers(isTeacherMode ? "teachers" : "students")}>Import CSV</button>
      </div>
      {importPreview && (
        <div className="csv-preview">
          <div className="admin-panel-title">
            <h3>CSV Preview</h3>
            <span className="badge">{importPreview.valid_rows}/{importPreview.total_rows} valid</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  {importPreview.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.rows.map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.status}</td>
                    {importPreview.headers.slice(0, 6).map((header) => <td key={header}>{row.data[header] || "-"}</td>)}
                    <td>{row.errors.join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <form onSubmit={saveUser} className="admin-inline-form">
        <input
          placeholder={isTeacherMode ? "Username" : "Enrollment Number"}
          value={userForm.username}
          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
          readOnly={!isTeacherMode && !editingUserId}
          required
        />
        <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
        {isTeacherMode && (
          <input placeholder={editingUserId ? "New password optional" : "Password"} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!editingUserId} />
        )}
        {isTeacherMode && (
          <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value, teacher_id: e.target.value === "teacher" ? userForm.teacher_id || getNextTeacherId() : "" })}>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        )}
        {isTeacherMode && userForm.role === "teacher" ? (
          <>
            <input placeholder="Teacher ID" value={userForm.teacher_id} readOnly required />
            <input placeholder="First Name" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} required />
            <input placeholder="Last Name" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} required />
            <input placeholder="Mobile Number" value={userForm.mobile_number} onChange={(e) => setUserForm({ ...userForm, mobile_number: e.target.value })} />
            <select value={userForm.gender} onChange={(e) => setUserForm({ ...userForm, gender: e.target.value })}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              type={userForm.date_of_birth ? "date" : "text"}
              placeholder="Date of Joining"
              value={userForm.date_of_birth}
              onFocus={(e) => {
                e.currentTarget.type = "date";
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value) {
                  e.currentTarget.type = "text";
                }
              }}
              onChange={(e) => setUserForm({ ...userForm, date_of_birth: e.target.value })}
            />
            <select value={userForm.course} onChange={(e) => setUserForm({ ...userForm, course: e.target.value })}>
              {programOptions.map((program) => <option key={program} value={program}>{program}</option>)}
            </select>
            <input
              placeholder="Assigned Subject Codes (comma separated, optional)"
              value={userForm.assigned_subjects}
              onChange={(e) => setUserForm({ ...userForm, assigned_subjects: e.target.value })}
            />
            <input placeholder="Religion" value={userForm.religion} onChange={(e) => setUserForm({ ...userForm, religion: e.target.value })} />
            <textarea placeholder="Address" value={userForm.address} onChange={(e) => setUserForm({ ...userForm, address: e.target.value })} />
          </>
        ) : !isTeacherMode ? (
          <>
            <input placeholder="Phone Number" value={userForm.mobile_number} onChange={(e) => setUserForm({ ...userForm, mobile_number: e.target.value })} />
            <select value={userForm.course} onChange={(e) => setUserForm({ ...userForm, course: e.target.value })}>
              {programOptions.map((program) => <option key={program} value={program}>{program}</option>)}
            </select>
          </>
        ) : null}
        <button type="submit">{editingUserId ? "Update" : isTeacherMode ? "Add Teacher" : "Register Student"}</button>
        {editingUserId && <button type="button" className="secondary-button" onClick={resetUserForm}>Cancel</button>}
      </form>
      <div className="search-bar">
        <label htmlFor={`${mode}Search`}>Search {isTeacherMode ? "teacher" : "student"}</label>
        <div className="search-action-row">
          <input
            id={`${mode}Search`}
            type="search"
            value={adminSearch[searchKey]}
            onChange={(e) => updateSearch(searchKey, e.target.value)}
            placeholder={isTeacherMode ? "Search by teacher ID, name, email, mobile, or program" : "Search by enrollment number, email, phone, or program"}
          />
          <button type="button" onClick={() => updateSearch(searchKey, adminSearch[searchKey].trim())}>Search</button>
        </div>
      </div>
      <div className="table-tools">
        {isTeacherMode ? renderSortButton(searchKey, "teacher_id", "Teacher ID") : renderSortButton(searchKey, "username", "Enrollment")}
        {isTeacherMode && renderSortButton(searchKey, "name", "Name")}
        {renderSortButton(searchKey, "email", "Email")}
        {renderSortButton(searchKey, "mobile", "Phone")}
        {renderSortButton(searchKey, "program", "Program")}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            {isTeacherMode ? (
              <tr>
                <th>S No.</th>
                <th>Teacher ID</th>
                <th>Teacher Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Program</th>
                <th>Assigned Subjects</th>
                <th>Date of Joining</th>
                <th>Religion</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            ) : (
              <tr>
                <th>S No.</th>
                <th>Enrollment Number</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Program</th>
                <th>Action</th>
              </tr>
            )}
          </thead>
          <tbody>
            {paginatedUsers.map((user, index) => (
              <tr key={user.id}>
                {isTeacherMode ? (
                  <>
                    <td>{(adminPage[searchKey] - 1) * pageSize + index + 1}</td>
                    <td>{user.teacher_id || "-"}</td>
                    <td>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}</td>
                    <td>{user.mobile_number || "-"}</td>
                    <td>{user.email || "-"}</td>
                    <td>{user.course || "-"}</td>
                    <td>{user.assigned_subjects || "-"}</td>
                    <td>{user.date_of_birth || "-"}</td>
                    <td>{user.religion || "-"}</td>
                    <td>{user.address || "-"}</td>
                  </>
                ) : (
                  <>
                    <td>{(adminPage[searchKey] - 1) * pageSize + index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.email || "-"}</td>
                    <td>{user.mobile_number || "-"}</td>
                    <td>{user.course || "-"}</td>
                  </>
                )}
                <td>
                  <div className="action-buttons">
                    <button className="compact-button" onClick={() => editUser(user)}>Edit</button>
                    <button className="danger-button compact-button" onClick={() => deleteUser(user.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr>
                  <td colSpan={isTeacherMode ? 11 : 6}>No {isTeacherMode ? "teachers" : "students"} match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={adminPage[searchKey]} pageSize={pageSize} total={visibleUsers.length} onPageChange={(page) => setAdminPage((pages) => ({ ...pages, [searchKey]: page }))} />
    </section>
    );
  };

  const renderCourses = () => {
    const sortState = adminSort.courses;
    const visibleCourses = courses.filter((course) =>
      matchesSearch(adminSearch.courses, [course.program, course.name, course.code, `Semester ${course.semester}`, course.semester])
    ).sort((first, second) => {
      const getValue = (course: Course) => {
        if (sortState.key === "program") return course.program;
        if (sortState.key === "name") return course.name;
        if (sortState.key === "semester") return course.semester;
        return course.code;
      };
      return compareValues(getValue(first), getValue(second), sortState.direction);
    });
    const paginatedCourses = paginate(visibleCourses, "courses");

    return (
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Manage Subject</h2>
          <span className="badge">{visibleCourses.length} Course/Subject</span>
        </div>
        {statusMessage}
        <form onSubmit={saveCourse} className="admin-inline-form">
          <select value={courseForm.program} onChange={(e) => setCourseForm({ ...courseForm, program: e.target.value })}>
            {programOptions.map((program) => <option key={program} value={program}>{program}</option>)}
          </select>
          <input placeholder="Subject Full Name" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} required />
          <input placeholder="Subject Code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} required />
          <select value={courseForm.semester} onChange={(e) => setCourseForm({ ...courseForm, semester: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
          <button type="submit">{editingCourseId ? "Update Subject" : "Add New Subject"}</button>
          {editingCourseId && <button type="button" className="secondary-button" onClick={resetCourseForm}>Cancel</button>}
        </form>
        <div className="search-bar">
          <label htmlFor="courseSearch">Search Course/Subject</label>
          <div className="search-action-row">
            <input
              id="courseSearch"
              type="search"
              value={adminSearch.courses}
              onChange={(e) => updateSearch("courses", e.target.value)}
              placeholder="Search by program, subject name, subject code, or semester"
            />
            <button type="button" onClick={() => updateSearch("courses", adminSearch.courses.trim())}>Search</button>
          </div>
        </div>
        <div className="table-tools">
          {renderSortButton("courses", "program", "Program")}
          {renderSortButton("courses", "code", "Code")}
          {renderSortButton("courses", "name", "Name")}
          {renderSortButton("courses", "semester", "Semester")}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Program</th>
                <th>Subject Full Name</th>
                <th>Subject Code</th>
                <th>Semester</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.map((course, index) => (
                <tr key={course.id}>
                  <td>{(adminPage.courses - 1) * pageSize + index + 1}</td>
                  <td>{course.program}</td>
                  <td>{course.name}</td>
                  <td>{course.code}</td>
                  <td>{course.semester}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="compact-button" onClick={() => editCourse(course)}>Edit</button>
                      <button className="danger-button compact-button" onClick={() => deleteCourse(course.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCourses.length === 0 && (
                <tr>
                  <td colSpan={6}>No Course/Subject matches your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={adminPage.courses} pageSize={pageSize} total={visibleCourses.length} onPageChange={(page) => setAdminPage((pages) => ({ ...pages, courses: page }))} />
      </section>
    );
  };

  const renderPrograms = () => {
    const visiblePrograms = programs
      .filter((program) => matchesSearch(adminSearch.programs, [program.name, program.created_at]))
      .sort((first, second) => compareValues(first.name, second.name, adminSort.programs.direction));
    const paginatedPrograms = paginate(visiblePrograms, "programs");

    return (
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Manage Program</h2>
          <span className="badge">{visiblePrograms.length} programs</span>
        </div>
        {statusMessage}
        <form onSubmit={saveProgram} className="admin-inline-form">
          <input placeholder="Program Name" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} required />
          <button type="submit">{editingProgramId ? "Update Program" : "Add Program"}</button>
          {editingProgramId && <button type="button" className="secondary-button" onClick={resetProgramForm}>Cancel</button>}
        </form>
        <div className="search-bar">
          <label htmlFor="programSearch">Search program</label>
          <div className="search-action-row">
            <input
              id="programSearch"
              type="search"
              value={adminSearch.programs}
              onChange={(e) => updateSearch("programs", e.target.value)}
              placeholder="Search by program name"
            />
            <button type="button" onClick={() => updateSearch("programs", adminSearch.programs.trim())}>Search</button>
          </div>
        </div>
        <div className="table-tools">
          {renderSortButton("programs", "name", "Program Name")}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>S No.</th>
                <th>Program Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPrograms.map((program, index) => (
                <tr key={program.id}>
                  <td>{(adminPage.programs - 1) * pageSize + index + 1}</td>
                  <td>{program.name}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="compact-button" onClick={() => editProgram(program)}>Edit</button>
                      <button className="danger-button compact-button" onClick={() => deleteProgram(program.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visiblePrograms.length === 0 && (
                <tr>
                  <td colSpan={3}>No programs match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={adminPage.programs} pageSize={pageSize} total={visiblePrograms.length} onPageChange={(page) => setAdminPage((pages) => ({ ...pages, programs: page }))} />
      </section>
    );
  };

  const renderPassword = () => (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Change Username & Password</h2>
      </div>
      {statusMessage}
      <form onSubmit={updateAccount} className="admin-inline-form account-settings-form">
        <input
          placeholder="Username"
          value={accountForm.username}
          onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
          required
        />
        <input
          placeholder="New Password"
          type="password"
          value={accountForm.password}
          onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
        />
        <input
          placeholder="Confirm Password"
          type="password"
          value={accountForm.confirmPassword}
          onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
        />
        <button type="submit">Update Account</button>
      </form>
    </section>
  );

  const renderProfile = () => (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Admin Profile</h2>
        {!isEditingAdminProfile && (
          <button type="button" className="compact-button" onClick={() => setIsEditingAdminProfile(true)}>
            Edit
          </button>
        )}
      </div>
      {statusMessage}
      {isEditingAdminProfile && (
        <form onSubmit={updateAdminProfile} className="admin-inline-form account-settings-form">
          <input
            placeholder="Email"
            type="email"
            value={adminProfileForm.email}
            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
            required
          />
          <input
            placeholder="First Name"
            value={adminProfileForm.first_name}
            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, first_name: e.target.value })}
          />
          <input
            placeholder="Last Name"
            value={adminProfileForm.last_name}
            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, last_name: e.target.value })}
          />
          <textarea
            placeholder="Address"
            value={adminProfileForm.address}
            onChange={(e) => setAdminProfileForm({ ...adminProfileForm, address: e.target.value })}
          />
          <button type="submit">Update Profile</button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setAdminProfileForm({
                username: user?.username || "",
                email: user?.email || "",
                first_name: user?.first_name || "",
                last_name: user?.last_name || "",
                address: user?.address || "",
              });
              setIsEditingAdminProfile(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}
      <div className="profile-grid">
        <div className="profile-card"><span>Role</span><strong>{user?.role || "admin"}</strong></div>
        <div className="profile-card"><span>Username</span><strong>{user?.username || "-"}</strong></div>
        <div className="profile-card"><span>Email</span><strong>{user?.email || "-"}</strong></div>
        <div className="profile-card"><span>First Name</span><strong>{user?.first_name || "-"}</strong></div>
        <div className="profile-card"><span>Last Name</span><strong>{user?.last_name || "-"}</strong></div>
        <div className="profile-card"><span>Full Name</span><strong>{`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "-"}</strong></div>
      </div>
    </section>
  );

  const renderAudit = () => (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Audit Log</h2>
        <span className="badge">{auditLogs.length} records</span>
      </div>
      {statusMessage}
      <div className="search-bar">
        <label htmlFor="auditSearch">Search activity</label>
        <div className="search-action-row">
          <input
            id="auditSearch"
            type="search"
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            placeholder="Search by actor, action, type, or details"
          />
          <button type="button" onClick={() => loadAuditLogs(auditSearch)}>Search</button>
        </div>
      </div>
      <div className="audit-filter-grid">
        <label>
          Action
          <select value={auditFilters.action} onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}>
            <option value="">All actions</option>
            {["created", "updated", "deleted", "submitted", "graded", "imported", "exported", "restored", "changed_password", "requested_password_reset", "reset_password", "activated"].map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={auditFilters.date_from} onChange={(e) => setAuditFilters({ ...auditFilters, date_from: e.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={auditFilters.date_to} onChange={(e) => setAuditFilters({ ...auditFilters, date_to: e.target.value })} />
        </label>
        <button type="button" onClick={() => loadAuditLogs(auditSearch)}>Apply Filters</button>
        <button type="button" className="secondary-button" onClick={() => {
          setAuditSearch("");
          setAuditFilters({ action: "", date_from: "", date_to: "" });
          setTimeout(() => loadAuditLogs(""), 0);
        }}>Clear</button>
      </div>
      <ReportsPanel />
      <div className="audit-panel">
        <div className="section-heading">
          <h3>Deleted Records</h3>
          <button type="button" className="secondary-button compact-button" onClick={loadDeletedRecords}>
            Load Deleted Records
          </button>
        </div>
        {deletedRecords.length === 0 ? (
          <p>No deleted records loaded.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Details</th>
                  <th>Deleted At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedRecords.map((record) => (
                  <tr key={`${record.type}-${record.id}`}>
                    <td>{record.type}</td>
                    <td>{record.name}</td>
                    <td>{record.details || "-"}</td>
                    <td>{record.deleted_at ? formatDate(record.deleted_at) : "-"}</td>
                    <td>
                      <button type="button" className="compact-button" onClick={() => restoreDeletedRecord(record)}>
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="audit-list audit-list-full">
        {auditLogs.map((log) => (
          <div className="audit-item" key={log.id}>
            <strong>{log.action} {log.target_type}</strong>
            <span>{log.details || log.target_id}</span>
            <small>{log.actor} - {formatDate(log.created_at)}</small>
          </div>
        ))}
        {auditLogs.length === 0 && <p>No activity found.</p>}
      </div>
    </section>
  );

  const sections = {
    overview: renderOverview,
    assignments: renderAssignments,
    programs: renderPrograms,
    teachers: () => renderUsers("teachers"),
    students: () => renderUsers("students"),
    courses: renderCourses,
    audit: renderAudit,
    profile: renderProfile,
    password: renderPassword,
  };

  return (
    <div className="admin-dashboard soft-admin">
      <aside className="admin-sidebar">
        <div className="admin-profile">
          <h2>Administrator</h2>
          <p>Admin workspace</p>
        </div>
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => changeSection("overview")}>Overview</button>
        <button className={activeSection === "assignments" ? "active" : ""} onClick={() => changeSection("assignments")}>Assignment</button>
        <button className={activeSection === "programs" ? "active" : ""} onClick={() => changeSection("programs")}>Program</button>
        <button className={activeSection === "courses" ? "active" : ""} onClick={() => changeSection("courses")}>Course/Subject</button>
        <button className={activeSection === "teachers" ? "active" : ""} onClick={() => openUserSection("teachers")}>Teacher</button>
        <button className={activeSection === "students" ? "active" : ""} onClick={() => openUserSection("students")}>Register Student</button>
        <button className={activeSection === "audit" ? "active" : ""} onClick={() => { changeSection("audit"); loadAuditLogs(); }}>Audit Log</button>
        <button className={activeSection === "profile" ? "active" : ""} onClick={() => changeSection("profile")}>Profile</button>
        <button className={activeSection === "password" ? "active" : ""} onClick={() => changeSection("password")}>Username & Password</button>
        <button className="admin-logout" onClick={handleLogout}>Logout</button>
      </aside>
      <div className="admin-screen">
        <main className="admin-content">{sections[activeSection]()}</main>
      </div>
    </div>
  );
}

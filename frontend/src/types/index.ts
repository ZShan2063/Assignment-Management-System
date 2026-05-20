export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "student" | "teacher" | "admin";
  course?: string;
  semester?: number;
  teacher_id?: string;
  mobile_number?: string;
  gender?: string;
  date_of_birth?: string;
  religion?: string;
  address?: string;
  assigned_subjects?: string;
  email_verified?: boolean;
  email_notifications_enabled?: boolean;
  deadline_reminders_enabled?: boolean;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  program: string;
  semester: number;
  description: string;
}

export interface Program {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  assignment_number: number;
  title: string;
  description: string;
  course: string;
  program: string;
  semester: number;
  assignment_file?: string | null;
  created_by: string;
  due_date: string;
  total_points: number;
  allow_late_submission: boolean;
  late_submission_until?: string | null;
  late_penalty_points: number;
  late_submission_note: string;
  allow_resubmission: boolean;
  max_attempts: number;
  status: "draft" | "active" | "closed";
  display_status?: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  assignment: number;
  assignment_number: number;
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
  attempt_number: number;
  result_status?: "Pending" | "Pass" | "Fail";
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AssignmentMessage {
  id: number;
  assignment: number;
  sender: string;
  sender_name: string;
  sender_role: "student" | "teacher" | "admin";
  message: string;
  created_at: string;
}

export interface AnalyticsSummary {
  teachers?: number;
  students?: number;
  programs?: number;
  courses?: number;
  assignments?: number;
  submissions?: number;
  graded?: number;
  pending?: number;
  passed?: number;
  failed?: number;
  average_score?: number;
  submitted?: number;
  missing?: number;
  late_submissions?: number;
}

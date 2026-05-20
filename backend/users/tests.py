from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from assignments.models import Assignment
from audit.models import AuditLog
from notifications.models import Notification
from submissions.models import Submission
from users.models import EmailVerificationToken, User


class PermissionFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username="admin", password="password123", role="admin", email="admin@example.com")
        self.teacher = User.objects.create_user(username="teacher", password="password123", role="teacher", email="teacher@example.com", teacher_id="T001", course="BCA")
        self.other_teacher = User.objects.create_user(username="other", password="password123", role="teacher", email="other@example.com", teacher_id="T002", course="BBA")
        self.student = User.objects.create_user(username="1000000001", password="password123", role="student", email="student@example.com", course="BCA")
        self.assignment = Assignment.objects.create(
            assignment_number=10001,
            title="Basics",
            course="BCS01",
            program="BCA",
            semester=1,
            created_by=self.teacher,
            due_date=timezone.now() + timedelta(days=7),
            total_points=100,
            status=Assignment.STATUS_ACTIVE,
        )
        self.submission = Submission.objects.create(
            assignment=self.assignment,
            student=self.student,
            uploaded_file="submissions/test.pdf",
            attempt_number=1,
        )
        for user in [self.admin, self.teacher, self.other_teacher, self.student]:
            Token.objects.get_or_create(user=user)

    def authenticate(self, user):
        token = Token.objects.get(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_public_register_route_is_closed(self):
        response = self.client.post("/api/users/register/", {"username": "open", "password": "password123"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_teacher_logs_in_with_teacher_id(self):
        response = self.client.post(
            "/api/users/login/",
            {"username": "T001", "password": "password123", "role": "teacher"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["role"], "teacher")

    def test_teacher_role_login_rejects_username_instead_of_teacher_id(self):
        response = self.client.post(
            "/api/users/login/",
            {"username": "teacher", "password": "password123", "role": "teacher"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_student_cannot_create_assignment(self):
        self.authenticate(self.student)
        response = self.client.post(
            "/api/assignments/",
            {
                "title": "Student Assignment",
                "course": "BCS01",
                "program": "BCA",
                "semester": 1,
                "due_date": (timezone.now() + timedelta(days=3)).isoformat(),
                "total_points": 100,
                "status": "active",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_teacher_cannot_create_assignment_for_other_program(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            "/api/assignments/",
            {
                "title": "Wrong Program",
                "course": "BBA01",
                "program": "BBA",
                "semester": 1,
                "due_date": (timezone.now() + timedelta(days=3)).isoformat(),
                "total_points": 100,
                "status": "active",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_other_teacher_cannot_grade_submission(self):
        self.authenticate(self.other_teacher)
        response = self.client.patch(f"/api/submissions/{self.submission.id}/", {"score": 80}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_admin_only_reports(self):
        self.authenticate(self.teacher)
        response = self.client.get("/api/upgrades/reports/users/")
        self.assertEqual(response.status_code, 403)
        self.authenticate(self.admin)
        response = self.client.get("/api/upgrades/reports/users/")
        self.assertEqual(response.status_code, 200)

    def test_non_admin_cannot_create_course(self):
        self.authenticate(self.teacher)
        response = self.client.post("/api/courses/", {"code": "BCS02", "name": "Data", "program": "BCA", "semester": 1}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_health_check_is_public(self):
        self.client.credentials()
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_admin_user_creation_validates_duplicates_and_formats(self):
        self.authenticate(self.admin)
        duplicate_email = self.client.post(
            "/api/users/admin/users/",
            {
                "username": "teacher2",
                "email": self.teacher.email,
                "password": "StrongPass123!",
                "role": "teacher",
                "teacher_id": "T003",
                "course": "BCA",
            },
            format="json",
        )
        self.assertEqual(duplicate_email.status_code, 400)
        self.assertIn("email", duplicate_email.json())

        duplicate_student = self.client.post(
            "/api/users/admin/users/",
            {
                "username": self.student.username,
                "email": self.teacher.email,
                "role": "student",
                "course": "BCA",
                "mobile_number": "9876543210",
            },
            format="json",
        )
        self.assertEqual(duplicate_student.status_code, 400)
        self.assertIn("enrollment_number", duplicate_student.json())
        self.assertIn("email", duplicate_student.json())

        invalid_phone = self.client.post(
            "/api/users/admin/users/",
            {
                "username": "1000000005",
                "email": "new-student@example.com",
                "role": "student",
                "course": "BCA",
                "mobile_number": "123",
            },
            format="json",
        )
        self.assertEqual(invalid_phone.status_code, 400)

        invalid_teacher_id = self.client.post(
            "/api/users/admin/users/",
            {
                "username": "teacher3",
                "email": "teacher3@example.com",
                "password": "StrongPass123!",
                "role": "teacher",
                "teacher_id": "2",
                "course": "BCA",
            },
            format="json",
        )
        self.assertEqual(invalid_teacher_id.status_code, 400)

    def test_deleted_student_enrollment_can_be_registered_again(self):
        self.authenticate(self.admin)
        delete_response = self.client.delete(f"/api/users/admin/users/{self.student.id}/")
        self.assertEqual(delete_response.status_code, 204)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)
        self.assertNotEqual(self.student.username, "1000000001")

        create_response = self.client.post(
            "/api/users/admin/users/",
            {
                "username": "1000000001",
                "email": "new-student@example.com",
                "role": "student",
                "course": "BCA",
                "mobile_number": "9876543210",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["username"], "1000000001")

    def test_deleted_student_enrollment_cannot_create_account(self):
        self.student.is_active = False
        self.student.deleted_at = timezone.now()
        self.student.save(update_fields=["is_active", "deleted_at"])

        lookup_response = self.client.get("/api/users/student/create-account/?username=1000000001")
        create_response = self.client.post(
            "/api/users/student/create-account/",
            {"username": "1000000001", "password": "StrongPass123!", "first_name": "Raj", "last_name": "A"},
            format="json",
        )

        self.assertEqual(lookup_response.status_code, 404)
        self.assertEqual(create_response.status_code, 404)

    def test_non_admin_cannot_access_backup_or_templates(self):
        self.authenticate(self.student)
        backup_response = self.client.get("/api/upgrades/reports/backup/")
        template_response = self.client.get("/api/upgrades/imports/students/template/")
        self.assertEqual(backup_response.status_code, 403)
        self.assertEqual(template_response.status_code, 403)

    def test_student_cannot_see_teacher_only_analytics(self):
        self.authenticate(self.student)
        response = self.client.get("/api/upgrades/analytics/teacher/")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_delete_assignment_and_audit_keeps_snapshot(self):
        self.authenticate(self.admin)
        response = self.client.delete(f"/api/assignments/{self.assignment.id}/")
        self.assertEqual(response.status_code, 204)
        self.assignment.refresh_from_db()
        self.assertTrue(self.assignment.is_deleted)
        audit_log = AuditLog.objects.filter(action="deleted", target_type="Assignment").first()
        self.assertIsNotNone(audit_log)
        self.assertIn("Deleted record snapshot", audit_log.details)
        self.assertIn("assignment_number=10001", audit_log.details)

    def test_admin_can_restore_soft_deleted_assignment(self):
        self.assignment.is_deleted = True
        self.assignment.deleted_at = timezone.now()
        self.assignment.save(update_fields=["is_deleted", "deleted_at"])
        self.authenticate(self.admin)

        list_response = self.client.get("/api/upgrades/deleted-records/")
        self.assertEqual(list_response.status_code, 200)
        self.assertTrue(any(item["type"] == "assignment" and item["id"] == self.assignment.id for item in list_response.json()))

        restore_response = self.client.post(
            "/api/upgrades/deleted-records/restore/",
            {"type": "assignment", "id": self.assignment.id},
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)
        self.assignment.refresh_from_db()
        self.assertFalse(self.assignment.is_deleted)

    def test_student_cannot_delete_assignment(self):
        self.authenticate(self.student)
        response = self.client.delete(f"/api/assignments/{self.assignment.id}/")
        self.assertEqual(response.status_code, 403)

    def test_student_does_not_see_draft_assignment_notifications(self):
        draft_assignment = Assignment.objects.create(
            assignment_number=10002,
            title="Maths",
            course="MTH01",
            program="BCA",
            semester=1,
            created_by=self.teacher,
            due_date=timezone.now() + timedelta(days=7),
            total_points=100,
            status=Assignment.STATUS_DRAFT,
        )
        Notification.objects.create(
            recipient=self.student,
            title="New assignment published",
            message=f"{draft_assignment.title} is now available.",
            link=f"assignment:{draft_assignment.id}",
        )
        Notification.objects.create(
            recipient=self.student,
            title="New assignment published",
            message=f"{self.assignment.title} is now available.",
            link=f"assignment:{self.assignment.id}",
        )

        self.authenticate(self.student)
        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, 200)
        messages = [item["message"] for item in response.json()]
        self.assertNotIn("Maths is now available.", messages)
        self.assertIn("Basics is now available.", messages)

    def test_student_only_sees_assignments_for_own_program(self):
        mba_student = User.objects.create_user(
            username="1000000003",
            password="password123",
            role="student",
            email="mba@example.com",
            course="MBA",
            semester=1,
        )
        Assignment.objects.create(
            assignment_number=10001,
            title="Business",
            course="MBA01",
            program="MBA",
            semester=1,
            created_by=self.other_teacher,
            due_date=timezone.now() + timedelta(days=7),
            total_points=100,
            status=Assignment.STATUS_ACTIVE,
        )
        Token.objects.get_or_create(user=mba_student)

        self.authenticate(mba_student)
        response = self.client.get("/api/assignments/")

        self.assertEqual(response.status_code, 200)
        titles = [assignment["title"] for assignment in response.json()]
        self.assertNotIn("Basics", titles)
        self.assertIn("Business", titles)

    def test_student_only_sees_assignments_for_own_semester(self):
        semester_two_assignment = Assignment.objects.create(
            assignment_number=10002,
            title="Second Semester",
            course="BCS02",
            program="BCA",
            semester=2,
            created_by=self.teacher,
            due_date=timezone.now() + timedelta(days=7),
            total_points=100,
            status=Assignment.STATUS_ACTIVE,
        )
        self.student.semester = 1
        self.student.save(update_fields=["semester"])

        self.authenticate(self.student)
        response = self.client.get("/api/assignments/")

        self.assertEqual(response.status_code, 200)
        titles = [assignment["title"] for assignment in response.json()]
        self.assertIn("Basics", titles)
        self.assertNotIn(semester_two_assignment.title, titles)

    def test_student_cannot_submit_assignment_from_other_program(self):
        mba_student = User.objects.create_user(
            username="1000000004",
            password="password123",
            role="student",
            email="mba-submit@example.com",
            course="MBA",
        )
        Token.objects.get_or_create(user=mba_student)

        self.authenticate(mba_student)
        response = self.client.post(
            "/api/submissions/",
            {
                "assignment": self.assignment.id,
                "uploaded_file": SimpleUploadedFile("answer.pdf", b"test", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("not assigned to your program", str(response.data))

    def test_submission_rejects_disallowed_file_type(self):
        self.authenticate(self.student)
        response = self.client.post(
            "/api/submissions/",
            {
                "assignment": self.assignment.id,
                "uploaded_file": SimpleUploadedFile("malware.exe", b"test", content_type="application/octet-stream"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Allowed file types", str(response.data))

    def test_teacher_subject_assignment_restricts_assignment_creation(self):
        self.teacher.assigned_subjects = "BCS01"
        self.teacher.save(update_fields=["assigned_subjects"])
        self.authenticate(self.teacher)

        response = self.client.post(
            "/api/assignments/",
            {
                "title": "Wrong Subject",
                "course": "BCS02",
                "program": "BCA",
                "semester": 1,
                "due_date": (timezone.now() + timedelta(days=3)).isoformat(),
                "total_points": 100,
                "status": "active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("assigned Course/Subject", str(response.data))

    def test_student_must_verify_email_after_account_creation(self):
        pending_student = User.objects.create_user(
            username="1000000002",
            role="student",
            email="pending@example.com",
            course="BCA",
        )
        pending_student.set_unusable_password()
        pending_student.save()

        create_response = self.client.post(
            "/api/users/student/create-account/",
            {
                "username": "1000000002",
                "first_name": "Pending",
                "last_name": "Student",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 200)
        pending_student.refresh_from_db()
        self.assertFalse(pending_student.email_verified)

        blocked_login = self.client.post(
            "/api/users/login/",
            {"username": "1000000002", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(blocked_login.status_code, 403)

        token = EmailVerificationToken.objects.filter(user=pending_student).first()
        verify_response = self.client.post("/api/users/verify-email/", {"token": token.token}, format="json")
        self.assertEqual(verify_response.status_code, 200)

        allowed_login = self.client.post(
            "/api/users/login/",
            {"username": "1000000002", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(allowed_login.status_code, 200)

    def test_assignment_discussion_permissions(self):
        self.authenticate(self.student)
        student_message = self.client.post(
            f"/api/assignments/{self.assignment.id}/messages/",
            {"message": "Please explain the deadline."},
            format="json",
        )
        self.assertEqual(student_message.status_code, 201)

        self.authenticate(self.teacher)
        teacher_messages = self.client.get(f"/api/assignments/{self.assignment.id}/messages/")
        self.assertEqual(teacher_messages.status_code, 200)
        self.assertEqual(len(teacher_messages.json()), 1)

        other_assignment = Assignment.objects.create(
            assignment_number=10001,
            title="Other Program",
            course="BBA01",
            program="BBA",
            semester=1,
            created_by=self.other_teacher,
            due_date=timezone.now() + timedelta(days=7),
            total_points=100,
            status=Assignment.STATUS_ACTIVE,
        )
        self.authenticate(self.student)
        forbidden_message = self.client.post(
            f"/api/assignments/{other_assignment.id}/messages/",
            {"message": "I should not access this."},
            format="json",
        )
        self.assertEqual(forbidden_message.status_code, 403)

import csv
import json
from io import TextIOWrapper

from django.core import serializers
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog
from audit.utils import log_action
from assignments.models import Assignment
from courses.models import Course, Program
from submissions.models import Submission
from users.models import User
from users.serializers import release_inactive_identity_conflicts


PASSING_SCORE = 40


def csv_response(filename, headers, rows):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(headers)
    writer.writerows(rows)
    return response


def is_admin(user):
    return getattr(user, "role", "") == "admin" or getattr(user, "is_superuser", False)


def date_range_filter(request, start_field="created_at", end_field=None):
    filters = {}
    date_from = parse_date(request.query_params.get("date_from", ""))
    date_to = parse_date(request.query_params.get("date_to", ""))
    if date_from:
        filters[f"{start_field}__date__gte"] = date_from
    if date_to:
        filters[f"{end_field or start_field}__date__lte"] = date_to
    return filters


def common_text_filter(request, fields):
    query = request.query_params.get("search", "").strip()
    if not query:
        return Q()
    lookup = Q()
    for field in fields:
        lookup |= Q(**{f"{field}__icontains": query})
    return lookup


def report_filters(request, queryset, *, date_field="created_at", text_fields=None):
    queryset = queryset.filter(**date_range_filter(request, date_field))
    field_names = {field.name for field in queryset.model._meta.get_fields()}
    program = request.query_params.get("program", "").strip()
    role = request.query_params.get("role", "").strip()
    teacher = request.query_params.get("teacher", "").strip()
    status_value = request.query_params.get("status", "").strip()
    if program and "program" in field_names:
        queryset = queryset.filter(program__iexact=program)
    if role and queryset.model is User:
        queryset = queryset.filter(role=role)
    if status_value and "status" in field_names:
        queryset = queryset.filter(status=status_value)
    if teacher and queryset.model is Assignment:
        queryset = queryset.filter(Q(created_by__username__icontains=teacher) | Q(created_by__teacher_id__icontains=teacher))
    if text_fields:
        queryset = queryset.filter(common_text_filter(request, text_fields))
    return queryset


def validate_import_row(role, row, row_number, seen_identifiers):
    cleaned = {key: (value or "").strip() for key, value in row.items()}
    errors = []
    if role == "students":
        identifier = cleaned.get("enrollment_number") or cleaned.get("username")
        if not identifier:
            errors.append("enrollment_number is required")
        if not cleaned.get("email"):
            errors.append("email is required")
        if not (cleaned.get("program") or cleaned.get("course")):
            errors.append("program is required")
    else:
        identifier = cleaned.get("username")
        if not identifier:
            errors.append("username is required")
        if not cleaned.get("email"):
            errors.append("email is required")
        if not cleaned.get("teacher_id"):
            errors.append("teacher_id is required")
        if not (cleaned.get("program") or cleaned.get("course")):
            errors.append("program is required")
        if not cleaned.get("password") and not User.objects.filter(username=identifier, is_active=True).exists():
            errors.append("password is required for new teachers")
    if identifier and identifier in seen_identifiers:
        errors.append("duplicate row in this CSV")
    if role == "teachers" and cleaned.get("teacher_id"):
        teacher_id = cleaned["teacher_id"]
        duplicate_teacher = User.objects.filter(teacher_id=teacher_id, is_active=True).exclude(username=identifier).exists()
        if duplicate_teacher:
            errors.append("teacher_id already belongs to another user")
    if role == "students" and identifier and User.objects.filter(username=identifier, is_active=True).exclude(role="student").exists():
        errors.append("enrollment number belongs to a non-student account")
    if identifier:
        seen_identifiers.add(identifier)
    return cleaned, identifier, errors


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        submissions = Submission.objects.all()
        graded = submissions.exclude(score__isnull=True)
        return Response({
            "teachers": User.objects.filter(role="teacher", is_active=True).count(),
            "students": User.objects.filter(role="student", is_active=True).count(),
            "programs": Program.objects.filter(is_deleted=False).count(),
            "courses": Course.objects.filter(is_deleted=False).count(),
            "assignments": Assignment.objects.filter(is_deleted=False).count(),
            "submissions": submissions.count(),
            "graded": graded.count(),
            "pending": submissions.filter(score__isnull=True).count(),
            "passed": graded.filter(score__gte=PASSING_SCORE).count(),
            "failed": graded.filter(score__lt=PASSING_SCORE).count(),
            "average_score": graded.aggregate(value=Avg("score"))["value"] or 0,
        })


class AuditLogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        search = request.query_params.get("search", "").strip()
        action = request.query_params.get("action", "").strip()
        date_from = parse_date(request.query_params.get("date_from", "").strip())
        date_to = parse_date(request.query_params.get("date_to", "").strip())
        logs = AuditLog.objects.select_related("actor").all()
        if search:
            logs = logs.filter(
                Q(action__icontains=search) |
                Q(target_type__icontains=search) |
                Q(target_id__icontains=search) |
                Q(details__icontains=search) |
                Q(actor__username__icontains=search)
            )
        if action:
            logs = logs.filter(action=action)
        if date_from:
            logs = logs.filter(created_at__date__gte=date_from)
        if date_to:
            logs = logs.filter(created_at__date__lte=date_to)
        logs = logs[:200]
        return Response([
            {
                "id": log.id,
                "actor": log.actor.username if log.actor else "system",
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in logs
        ])


class UserImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, role):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        if role not in {"students", "teachers"}:
            return Response({"detail": "Use students or teachers."}, status=400)
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "CSV file is required."}, status=400)

        reader = csv.DictReader(TextIOWrapper(uploaded_file.file, encoding="utf-8-sig"))
        is_preview = request.query_params.get("preview") == "true"
        if is_preview:
            rows = []
            errors = []
            seen_identifiers = set()
            for row_number, row in enumerate(reader, start=2):
                cleaned, identifier, row_errors = validate_import_row(role, row, row_number, seen_identifiers)
                status_text = "Will update" if identifier and User.objects.filter(username=identifier, is_active=True).exists() else "Will create"
                if row_errors:
                    errors.append({"row": row_number, "error": "; ".join(row_errors)})
                    status_text = "Needs fix"
                rows.append({"row": row_number, "status": status_text, "data": cleaned, "errors": row_errors})
            return Response({
                "headers": reader.fieldnames or [],
                "rows": rows[:50],
                "total_rows": len(rows),
                "valid_rows": len([row for row in rows if not row["errors"]]),
                "errors": errors,
            })

        created = 0
        updated = 0
        errors = []

        seen_identifiers = set()
        for row_number, row in enumerate(reader, start=2):
            try:
                cleaned, identifier, row_errors = validate_import_row(role, row, row_number, seen_identifiers)
                if row_errors:
                    raise ValueError("; ".join(row_errors))
                if role == "students":
                    username = identifier
                    if not username:
                        raise ValueError("enrollment_number is required")
                    release_inactive_identity_conflicts(username=username)
                    user, was_created = User.objects.get_or_create(username=username, is_active=True, defaults={"role": "student"})
                    user.role = "student"
                    user.email = cleaned.get("email") or user.email or ""
                    user.mobile_number = cleaned.get("phone_number") or cleaned.get("mobile_number") or user.mobile_number or ""
                    user.course = cleaned.get("program") or cleaned.get("course") or user.course or ""
                    user.set_unusable_password() if was_created else None
                else:
                    username = identifier
                    if not username:
                        raise ValueError("username is required")
                    release_inactive_identity_conflicts(username=username, teacher_id=cleaned.get("teacher_id"))
                    user, was_created = User.objects.get_or_create(username=username, is_active=True, defaults={"role": "teacher"})
                    user.role = "teacher"
                    user.email = cleaned.get("email") or user.email or ""
                    user.teacher_id = cleaned.get("teacher_id") or user.teacher_id or ""
                    user.first_name = cleaned.get("first_name") or user.first_name or ""
                    user.last_name = cleaned.get("last_name") or user.last_name or ""
                    user.mobile_number = cleaned.get("mobile_number") or cleaned.get("phone_number") or user.mobile_number or ""
                    user.course = cleaned.get("program") or cleaned.get("course") or user.course or ""
                    if cleaned.get("password"):
                        user.set_password(cleaned["password"])
                    elif was_created:
                        user.set_unusable_password()
                user.save()
                created += 1 if was_created else 0
                updated += 0 if was_created else 1
                log_action(request.user, "imported", user, f"CSV {role} import")
            except Exception as exc:
                errors.append({"row": row_number, "error": str(exc)})

        return Response({"created": created, "updated": updated, "errors": errors}, status=status.HTTP_200_OK)


class UserImportTemplateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, role):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        if role == "students":
            return csv_response(
                "students_import_template.csv",
                ["enrollment_number", "email", "phone_number", "program"],
                [["1000000001", "student@example.com", "9876543210", "BCA"]],
            )
        if role == "teachers":
            return csv_response(
                "teachers_import_template.csv",
                ["username", "email", "password", "teacher_id", "first_name", "last_name", "mobile_number", "program"],
                [["teacher01", "teacher@example.com", "password123", "T001", "First", "Last", "9876543210", "BCA"]],
            )
        return Response({"detail": "Use students or teachers."}, status=400)


class BackupExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        models = [User, Program, Course, Assignment, Submission, AuditLog]
        payload = {
            "generated_by": request.user.username,
            "format": "django-json-backup",
            "objects": json.loads(serializers.serialize("json", [obj for model in models for obj in model.objects.all()])),
        }
        response = HttpResponse(json.dumps(payload, indent=2, default=str), content_type="application/json")
        response["Content-Disposition"] = 'attachment; filename="ams_backup.json"'
        log_action(request.user, "exported", None, "Admin exported system backup")
        return response


class BackupRestoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "Backup JSON file is required."}, status=400)
        try:
            payload = json.loads(uploaded_file.read().decode("utf-8"))
            objects = payload.get("objects", payload)
            model_counts = {}
            for item in objects:
                model_name = item.get("model", "unknown")
                model_counts[model_name] = model_counts.get(model_name, 0) + 1
            if request.query_params.get("preview") == "true":
                return Response({"total_objects": len(objects), "models": model_counts})
            if request.data.get("confirm") != "RESTORE":
                return Response({"detail": "Type RESTORE to confirm backup restore."}, status=400)
            restored = 0
            with transaction.atomic():
                for obj in serializers.deserialize("json", json.dumps(objects), ignorenonexistent=True):
                    obj.save()
                    restored += 1
            log_action(request.user, "restored", None, f"Admin restored {restored} objects from backup")
            return Response({"restored": restored})
        except Exception as exc:
            return Response({"detail": f"Backup restore failed: {exc}"}, status=400)


class TeacherAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "teacher":
            return Response({"detail": "Teachers only."}, status=403)
        assignments = Assignment.objects.filter(created_by=request.user)
        submissions = Submission.objects.filter(assignment__in=assignments)
        graded = submissions.exclude(score__isnull=True)
        return Response({
            "assignments": assignments.count(),
            "submissions": submissions.count(),
            "graded": graded.count(),
            "pending": submissions.filter(score__isnull=True).count(),
            "passed": graded.filter(score__gte=PASSING_SCORE).count(),
            "failed": graded.filter(score__lt=PASSING_SCORE).count(),
            "average_score": graded.aggregate(value=Avg("score"))["value"] or 0,
            "submissions_by_assignment": list(assignments.annotate(total=Count("submissions")).values("assignment_number", "title", "total")),
        })


class StudentProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "student":
            return Response({"detail": "Students only."}, status=403)
        now = timezone.now()
        assignments = Assignment.objects.filter(status=Assignment.STATUS_ACTIVE, is_deleted=False, program__iexact=(request.user.course or "").strip()).filter(
            Q(semester=request.user.semester) | Q(pk__isnull=False, semester__isnull=True) if request.user.semester else Q()
        ).filter(
            Q(due_date__gte=now) |
            Q(allow_late_submission=True, late_submission_until__isnull=True) |
            Q(allow_late_submission=True, late_submission_until__gte=now)
        )
        submissions = Submission.objects.filter(student=request.user)
        graded = submissions.exclude(score__isnull=True)
        submitted_ids = submissions.values_list("assignment_id", flat=True)
        return Response({
            "assignments": assignments.count(),
            "submitted": submissions.count(),
            "missing": assignments.exclude(id__in=submitted_ids).count(),
            "graded": graded.count(),
            "late_submissions": submissions.filter(is_late=True).count(),
            "passed": graded.filter(score__gte=PASSING_SCORE).count(),
            "failed": graded.filter(score__lt=PASSING_SCORE).count(),
            "average_score": graded.aggregate(value=Avg("score"))["value"] or 0,
        })


class AssignmentReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        assignments = report_filters(
            request,
            Assignment.objects.filter(is_deleted=False).select_related("created_by"),
            date_field="created_at",
            text_fields=["title", "course", "program", "created_by__username", "created_by__teacher_id"],
        ).order_by("assignment_number")
        rows = assignments.values_list(
            "assignment_number", "title", "program", "semester", "course", "created_by__username", "created_by__teacher_id", "due_date"
        )
        return csv_response("assignments_report.csv", ["No", "Title", "Program", "Semester", "Subject", "Teacher", "Teacher ID", "Deadline"], rows)


class SubmissionReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        submissions = Submission.objects.select_related("assignment", "student").filter(**date_range_filter(request, "submitted_at"))
        program = request.query_params.get("program", "").strip()
        teacher = request.query_params.get("teacher", "").strip()
        result = request.query_params.get("result", "").strip().lower()
        search = common_text_filter(request, ["assignment__title", "assignment__course", "student__username", "student__first_name", "student__last_name"])
        if program:
            submissions = submissions.filter(assignment__program__iexact=program)
        if teacher:
            submissions = submissions.filter(Q(assignment__created_by__username__icontains=teacher) | Q(assignment__created_by__teacher_id__icontains=teacher))
        if result == "pass":
            submissions = submissions.filter(score__gte=PASSING_SCORE)
        elif result == "fail":
            submissions = submissions.filter(score__lt=PASSING_SCORE)
        elif result == "pending":
            submissions = submissions.filter(score__isnull=True)
        rows = submissions.filter(search).order_by("assignment__assignment_number", "student__username").values_list(
            "assignment__assignment_number", "assignment__title", "student__username", "student__first_name", "student__last_name", "submitted_at", "is_late", "score", "feedback"
        )
        return csv_response("submissions_report.csv", ["Assignment No", "Assignment", "Enrollment", "First Name", "Last Name", "Submitted At", "Late", "Score", "Feedback"], rows)


class UserReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        users = User.objects.filter(is_active=True).filter(common_text_filter(request, ["username", "email", "first_name", "last_name", "teacher_id", "mobile_number", "course"]))
        role = request.query_params.get("role", "").strip()
        program = request.query_params.get("program", "").strip()
        if role:
            users = users.filter(role=role)
        if program:
            users = users.filter(course__iexact=program)
        rows = users.order_by("role", "username").values_list("username", "email", "first_name", "last_name", "role", "teacher_id", "mobile_number", "course", "semester")
        return csv_response("users_report.csv", ["Username", "Email", "First Name", "Last Name", "Role", "Teacher ID", "Mobile", "Program", "Semester"], rows)


class CourseReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        courses = Course.objects.filter(is_deleted=False).filter(common_text_filter(request, ["program", "code", "name"]))
        program = request.query_params.get("program", "").strip()
        if program:
            courses = courses.filter(program__iexact=program)
        rows = courses.order_by("program", "semester", "code").values_list("program", "semester", "code", "name")
        return csv_response("courses_report.csv", ["Program", "Semester", "Subject Code", "Subject Name"], rows)


class AuditReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admins only."}, status=403)
        logs = AuditLog.objects.select_related("actor").filter(**date_range_filter(request, "created_at")).filter(
            common_text_filter(request, ["actor__username", "action", "target_type", "target_id", "details"])
        )
        action = request.query_params.get("action", "").strip()
        if action:
            logs = logs.filter(action=action)
        rows = logs.values_list("created_at", "actor__username", "action", "target_type", "target_id", "details")
        return csv_response("audit_report.csv", ["Created At", "Actor", "Action", "Target Type", "Target ID", "Details"], rows)


class StudentTranscriptReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "student":
            return Response({"detail": "Students only."}, status=403)
        submissions = Submission.objects.filter(student=request.user).select_related("assignment").order_by("assignment__assignment_number", "attempt_number")
        rows = []
        for submission in submissions:
            result = "Pending"
            if submission.score is not None:
                result = "Pass" if submission.score >= PASSING_SCORE else "Fail"
            rows.append([
                submission.assignment.assignment_number,
                submission.assignment.title,
                submission.assignment.program,
                submission.assignment.semester,
                submission.assignment.course,
                submission.attempt_number,
                submission.submitted_at,
                "Late" if submission.is_late else "On time",
                submission.score if submission.score is not None else "",
                result,
                submission.feedback,
            ])
        return csv_response(
            f"{request.user.username}_transcript.csv",
            ["Assignment No", "Assignment", "Program", "Semester", "Subject", "Attempt", "Submitted At", "Submission Status", "Score", "Result", "Feedback"],
            rows,
        )


class DeletedRecordListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        records = []
        for user in User.objects.filter(is_active=False).order_by("-deleted_at")[:50]:
            records.append({"type": "user", "id": user.id, "name": user.username, "details": user.role, "deleted_at": user.deleted_at})
        for assignment in Assignment.objects.filter(is_deleted=True).order_by("-deleted_at")[:50]:
            records.append({"type": "assignment", "id": assignment.id, "name": assignment.title, "details": assignment.assignment_number, "deleted_at": assignment.deleted_at})
        for course in Course.objects.filter(is_deleted=True).order_by("-deleted_at")[:50]:
            records.append({"type": "course", "id": course.id, "name": course.name, "details": course.code, "deleted_at": course.deleted_at})
        for program in Program.objects.filter(is_deleted=True).order_by("-deleted_at")[:50]:
            records.append({"type": "program", "id": program.id, "name": program.name, "details": "", "deleted_at": program.deleted_at})
        return Response(sorted(records, key=lambda item: item["deleted_at"] or timezone.now(), reverse=True)[:100])


class RestoreDeletedRecordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_admin(request.user):
            return Response({"detail": "Admins only."}, status=403)
        record_type = request.data.get("type", "").strip()
        record_id = request.data.get("id")
        model_map = {
            "user": User,
            "assignment": Assignment,
            "course": Course,
            "program": Program,
        }
        model = model_map.get(record_type)
        if not model or not record_id:
            return Response({"detail": "Record type and id are required."}, status=400)
        instance = generics.get_object_or_404(model, pk=record_id)
        if record_type == "user":
            instance.is_active = True
            instance.deleted_at = None
            instance.save(update_fields=["is_active", "deleted_at"])
        else:
            instance.is_deleted = False
            instance.deleted_at = None
            instance.save(update_fields=["is_deleted", "deleted_at"])
        log_action(request.user, "restored", instance, f"Restored deleted {record_type} {record_id}")
        return Response({"detail": "Record restored successfully."})

from rest_framework import serializers
from django.utils import timezone
from pathlib import Path

from .models import Assignment, AssignmentMessage

MAX_ASSIGNMENT_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_ASSIGNMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt", ".zip"}


class AssignmentSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    display_status = serializers.SerializerMethodField()

    def get_display_status(self, obj):
        if obj.status == Assignment.STATUS_ACTIVE and obj.due_date < timezone.now():
            return Assignment.STATUS_CLOSED
        return obj.status

    class Meta:
        model = Assignment
        fields = [
            "id",
            "assignment_number",
            "title",
            "description",
            "course",
            "program",
            "semester",
            "assignment_file",
            "created_by",
            "due_date",
            "total_points",
            "allow_late_submission",
            "late_submission_until",
            "late_penalty_points",
            "late_submission_note",
            "allow_resubmission",
            "max_attempts",
            "status",
            "display_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["assignment_number", "created_by", "display_status", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        program = attrs.get("program", getattr(self.instance, "program", ""))
        course = attrs.get("course", getattr(self.instance, "course", ""))
        status = attrs.get("status", getattr(self.instance, "status", Assignment.STATUS_ACTIVE))
        if user and getattr(user, "role", "") == "teacher" and user.course and program != user.course:
            raise serializers.ValidationError({"program": f"You can only create assignments for your assigned program: {user.course}."})
        if user and getattr(user, "role", "") == "teacher" and getattr(user, "assigned_subjects", ""):
            allowed_subjects = {item.strip().lower() for item in user.assigned_subjects.split(",") if item.strip()}
            if course.lower() not in allowed_subjects:
                raise serializers.ValidationError({"course": "You can only create assignments for your assigned Course/Subject."})
        if user and getattr(user, "role", "") == "teacher" and status == Assignment.STATUS_CLOSED:
            raise serializers.ValidationError({"status": "Closed is automatic after the due date. Choose Active or Draft."})
        allow_late = attrs.get("allow_late_submission", getattr(self.instance, "allow_late_submission", False))
        late_until = attrs.get("late_submission_until", getattr(self.instance, "late_submission_until", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if allow_late and late_until and due_date and late_until <= due_date:
            raise serializers.ValidationError({"late_submission_until": "Late submission date must be after the due date."})
        return attrs

    def validate_assignment_file(self, value):
        if not value:
            return value
        if value.size > MAX_ASSIGNMENT_FILE_SIZE:
            raise serializers.ValidationError("Assignment file must be 10 MB or smaller.")
        extension = Path(value.name).suffix.lower()
        if extension not in ALLOWED_ASSIGNMENT_EXTENSIONS:
            raise serializers.ValidationError("Allowed file types: PDF, DOC, DOCX, JPG, PNG, TXT, ZIP.")
        return value


class AssignmentMessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField(read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    class Meta:
        model = AssignmentMessage
        fields = ["id", "assignment", "sender", "sender_name", "sender_role", "message", "created_at"]
        read_only_fields = ["assignment", "sender", "created_at"]

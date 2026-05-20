from django.utils import timezone
from pathlib import Path

from rest_framework import serializers

from .models import Submission

MAX_SUBMISSION_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_SUBMISSION_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt", ".zip"}


class SubmissionSerializer(serializers.ModelSerializer):
    student = serializers.StringRelatedField(read_only=True)
    student_full_name = serializers.SerializerMethodField()
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    assignment_number = serializers.IntegerField(source="assignment.assignment_number", read_only=True)
    result_status = serializers.SerializerMethodField()

    def get_student_full_name(self, obj):
        full_name = f"{obj.student.first_name} {obj.student.last_name}".strip()
        return full_name or obj.student.username

    def get_result_status(self, obj):
        if obj.score is None:
            return "Pending"
        passing_marks = max(round(obj.assignment.total_points * 0.4), 1)
        return "Pass" if obj.score >= passing_marks else "Fail"

    class Meta:
        model = Submission
        fields = [
            "id",
            "assignment",
            "assignment_number",
            "assignment_title",
            "student",
            "student_full_name",
            "uploaded_file",
            "comment",
            "submitted_at",
            "score",
            "feedback",
            "graded_at",
            "is_late",
            "attempt_number",
            "result_status",
        ]
        read_only_fields = ["student", "submitted_at", "graded_at", "is_late", "attempt_number"]

    def update(self, instance, validated_data):
        if 'score' in validated_data and instance.score != validated_data['score']:
            validated_data['graded_at'] = timezone.now()
        return super().update(instance, validated_data)

    def validate(self, attrs):
        assignment = attrs.get("assignment")
        if assignment and self.context["request"].user == assignment.created_by:
            raise serializers.ValidationError("Teachers cannot submit to their own assignment.")
        if assignment and assignment.is_deleted:
            raise serializers.ValidationError("This assignment is no longer available.")
        if assignment and self.context["request"].user.is_student():
            student_program = (self.context["request"].user.course or "").strip().lower()
            assignment_program = (assignment.program or "").strip().lower()
            if assignment_program != student_program:
                raise serializers.ValidationError("This assignment is not assigned to your program.")
            student_semester = self.context["request"].user.semester
            if student_semester and assignment.semester != student_semester:
                raise serializers.ValidationError("This assignment is not assigned to your semester.")
        if assignment and assignment.status != "active":
            raise serializers.ValidationError("This assignment is not active.")
        now = timezone.now()
        if assignment and assignment.due_date < now:
            if not assignment.allow_late_submission:
                raise serializers.ValidationError("The deadline has passed and late submission is not allowed.")
            if assignment.late_submission_until and assignment.late_submission_until < now:
                raise serializers.ValidationError("The late submission date has passed.")
        if assignment and self.context["request"].method == "POST":
            existing_attempts = Submission.objects.filter(assignment=assignment, student=self.context["request"].user).count()
            if existing_attempts > 0 and not assignment.allow_resubmission:
                raise serializers.ValidationError("Resubmission is not allowed for this assignment.")
            if existing_attempts >= assignment.max_attempts:
                raise serializers.ValidationError("Maximum submission attempts reached.")
        return attrs

    def validate_uploaded_file(self, value):
        if value.size > MAX_SUBMISSION_FILE_SIZE:
            raise serializers.ValidationError("Submission file must be 10 MB or smaller.")
        extension = Path(value.name).suffix.lower()
        if extension not in ALLOWED_SUBMISSION_EXTENSIONS:
            raise serializers.ValidationError("Allowed file types: PDF, DOC, DOCX, JPG, PNG, TXT, ZIP.")
        return value

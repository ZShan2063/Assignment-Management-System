from django.conf import settings
from django.db import models


class Assignment(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_CLOSED, "Closed"),
    ]

    assignment_number = models.PositiveIntegerField(default=10001)
    title = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    course = models.CharField(max_length=48)
    program = models.CharField(max_length=32)
    semester = models.PositiveSmallIntegerField()
    assignment_file = models.FileField(upload_to="assignments/%Y/%m/%d/", blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_assignments")
    due_date = models.DateTimeField()
    total_points = models.PositiveIntegerField(default=100)
    allow_late_submission = models.BooleanField(default=False)
    late_submission_until = models.DateTimeField(blank=True, null=True)
    late_penalty_points = models.PositiveIntegerField(default=0)
    late_submission_note = models.CharField(max_length=255, blank=True)
    allow_resubmission = models.BooleanField(default=True)
    max_attempts = models.PositiveIntegerField(default=3)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-due_date", "title"]
        constraints = [
            models.UniqueConstraint(fields=["created_by", "assignment_number"], name="unique_assignment_number_per_teacher"),
        ]

    def __str__(self):
        return f"{self.title} ({self.program} Sem {self.semester})"


class AssignmentMessage(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignment_messages")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message by {self.sender.username} on {self.assignment.title}"

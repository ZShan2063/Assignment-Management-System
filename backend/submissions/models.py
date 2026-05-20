from django.conf import settings
from django.db import models


class Submission(models.Model):
    assignment = models.ForeignKey("assignments.Assignment", on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    uploaded_file = models.FileField(upload_to="submissions/%Y/%m/%d/")
    comment = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    score = models.PositiveIntegerField(blank=True, null=True)
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(blank=True, null=True)
    is_late = models.BooleanField(default=False)
    attempt_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(fields=["assignment", "student", "attempt_number"], name="unique_submission_attempt_per_student"),
        ]

    def __str__(self):
        return f"Submission {self.id} by {self.student.username} for {self.assignment.title}"

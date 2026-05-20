from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

COURSE_CHOICES = [
    ("BCA", "BCA"),
    ("BBA", "BBA"),
    ("B.Tech", "B.Tech"),
    ("MCA", "MCA"),
    ("MBA", "MBA"),
    ("M.Tech", "M.Tech"),
]

ROLE_CHOICES = [
    ("student", "Student"),
    ("teacher", "Teacher"),
    ("admin", "Admin"),
]


class User(AbstractUser):
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default="student")
    course = models.CharField(max_length=32, blank=True, null=True)
    semester = models.PositiveSmallIntegerField(blank=True, null=True)
    teacher_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    gender = models.CharField(max_length=16, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    religion = models.CharField(max_length=64, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    assigned_subjects = models.TextField(blank=True, default="", help_text="Comma-separated subject codes this teacher can create assignments for.")
    deleted_at = models.DateTimeField(blank=True, null=True)
    email_verified = models.BooleanField(default=True)
    email_notifications_enabled = models.BooleanField(default=True)
    deadline_reminders_enabled = models.BooleanField(default=True)

    def is_student(self):
        return self.role == "student"

    def is_teacher(self):
        return self.role == "teacher" or self.role == "admin"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self):
        return self.used_at is None and self.created_at >= timezone.now() - timedelta(hours=1)


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_verification_tokens")
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self):
        return self.used_at is None and self.created_at >= timezone.now() - timedelta(hours=24)

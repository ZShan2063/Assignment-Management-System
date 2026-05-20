from django.db import models

COURSE_TYPES = [
    ("BCA", "BCA"),
    ("BBA", "BBA"),
    ("B.Tech", "B.Tech"),
    ("MCA", "MCA"),
    ("MBA", "MBA"),
    ("M.Tech", "M.Tech"),
]

SEMESTER_CHOICES = [(i, f"Semester {i}") for i in range(1, 9)]


class Semester(models.Model):
    number = models.PositiveSmallIntegerField(choices=SEMESTER_CHOICES, unique=True)
    year = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"Semester {self.number} - {self.year}"


class Program(models.Model):
    name = models.CharField(max_length=48, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Course(models.Model):
    code = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=128)
    program = models.CharField(max_length=48)
    semester = models.PositiveSmallIntegerField(choices=SEMESTER_CHOICES)
    description = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["program", "semester", "code"]

    def __str__(self):
        return f"{self.program} {self.code} (Sem {self.semester})"

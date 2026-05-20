import json
from pathlib import Path

from django.core import serializers
from django.core.management.base import BaseCommand
from django.utils import timezone

from assignments.models import Assignment
from audit.models import AuditLog
from courses.models import Course, Program
from submissions.models import Submission
from users.models import User


class Command(BaseCommand):
    help = "Export a JSON backup for users, programs, subjects, assignments, submissions, and audit logs."

    def add_arguments(self, parser):
        parser.add_argument("--output", default="backups", help="Directory where the backup JSON should be written.")

    def handle(self, *args, **options):
        output_dir = Path(options["output"])
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = output_dir / f"ams_backup_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"
        models = [User, Program, Course, Assignment, Submission, AuditLog]
        objects = [obj for model in models for obj in model.objects.all()]
        payload = {
            "generated_at": timezone.now().isoformat(),
            "format": "django-json-backup",
            "objects": json.loads(serializers.serialize("json", objects)),
        }
        filename.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Backup exported: {filename}"))

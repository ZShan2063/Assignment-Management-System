from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from assignments.models import Assignment


class Command(BaseCommand):
    help = "Mark active assignments as closed when their due date and allowed late window have passed."

    def handle(self, *args, **options):
        now = timezone.now()
        expired = Assignment.objects.filter(status=Assignment.STATUS_ACTIVE, is_deleted=False).filter(
            Q(allow_late_submission=False, due_date__lt=now)
            | Q(allow_late_submission=True, late_submission_until__isnull=False, late_submission_until__lt=now)
        )
        count = expired.update(status=Assignment.STATUS_CLOSED, updated_at=now)
        self.stdout.write(self.style.SUCCESS(f"Closed {count} expired assignment(s)."))

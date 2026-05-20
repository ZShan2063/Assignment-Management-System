from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from assignments.models import Assignment
from notifications.utils import notify_user
from users.models import User


class Command(BaseCommand):
    help = "Send assignment deadline reminder notifications to students."

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=24, help="Send reminders for assignments due within this many hours.")

    def handle(self, *args, **options):
        now = timezone.now()
        until = now + timedelta(hours=options["hours"])
        assignments = Assignment.objects.filter(status=Assignment.STATUS_ACTIVE, due_date__gte=now, due_date__lte=until)
        sent = 0
        for assignment in assignments:
            students = User.objects.filter(
                role="student",
                course=assignment.program,
                deadline_reminders_enabled=True,
            ).filter(Q(semester=assignment.semester) | Q(semester__isnull=True))
            for student in students:
                notify_user(
                    student,
                    "Assignment deadline reminder",
                    f"{assignment.title} is due on {assignment.due_date.date()}.",
                    link=f"assignment:{assignment.id}",
                    email_subject="Assignment deadline reminder",
                    email_message=(
                        f"Assignment No: {assignment.assignment_number}\n"
                        f"Title: {assignment.title}\n"
                        f"Deadline: {assignment.due_date}"
                    ),
                )
                sent += 1
        self.stdout.write(self.style.SUCCESS(f"Deadline reminders sent: {sent}"))

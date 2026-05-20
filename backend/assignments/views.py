from rest_framework import generics, permissions
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Assignment
from .serializers import AssignmentMessageSerializer, AssignmentSerializer
from audit.utils import log_action, log_delete_action
from notifications.utils import notify_user
from notifications.models import Notification
from users.models import User


class AssignmentListCreateView(generics.ListCreateAPIView):
    queryset = Assignment.objects.filter(is_deleted=False)
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", "") == "teacher":
            return Assignment.objects.filter(created_by=user, is_deleted=False)
        if getattr(user, "role", "") == "student":
            return Assignment.objects.filter(
                status=Assignment.STATUS_ACTIVE,
                program__iexact=(user.course or "").strip(),
                is_deleted=False,
            ).filter(
                Q(semester=user.semester) | Q(pk__isnull=False, semester__isnull=True) if user.semester else Q()
            ).filter(
                Q(due_date__gte=timezone.now()) |
                Q(allow_late_submission=True, late_submission_until__isnull=True) |
                Q(allow_late_submission=True, late_submission_until__gte=timezone.now())
            )
        return Assignment.objects.filter(is_deleted=False)

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "role", "") != "teacher":
            return Response({"detail": "Only teachers can create assignments."}, status=403)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        next_number = 10001
        last_assignment = Assignment.objects.filter(created_by=self.request.user).order_by("-assignment_number").first()
        if last_assignment:
            next_number = last_assignment.assignment_number + 1
        assignment = serializer.save(created_by=self.request.user, assignment_number=next_number)
        log_action(self.request.user, "created", assignment, f"Assignment {assignment.assignment_number}: {assignment.title}")
        if assignment.status == Assignment.STATUS_ACTIVE:
            students = User.objects.filter(role="student", is_active=True, course__iexact=assignment.program).filter(Q(semester=assignment.semester) | Q(semester__isnull=True))
            for student in students:
                notify_user(
                    student,
                    "New assignment published",
                    f"{assignment.title} is now available.",
                    link=f"assignment:{assignment.id}",
                    email_subject="New assignment published",
                    email_message=(
                        f"A new assignment has been published.\n\n"
                        f"Assignment No: {assignment.assignment_number}\n"
                        f"Title: {assignment.title}\n"
                        f"Program: {assignment.program}\n"
                        f"Semester: {assignment.semester}\n"
                        f"Course/Subject: {assignment.course}\n"
                        f"Deadline: {assignment.due_date.date()}"
                    ),
                )


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Assignment.objects.filter(is_deleted=False)
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", "") == "teacher":
            return Assignment.objects.filter(created_by=user, is_deleted=False)
        if getattr(user, "role", "") == "student":
            return Assignment.objects.filter(
                status=Assignment.STATUS_ACTIVE,
                program__iexact=(user.course or "").strip(),
                is_deleted=False,
            ).filter(
                Q(semester=user.semester) | Q(pk__isnull=False, semester__isnull=True) if user.semester else Q()
            ).filter(
                Q(due_date__gte=timezone.now()) |
                Q(allow_late_submission=True, late_submission_until__isnull=True) |
                Q(allow_late_submission=True, late_submission_until__gte=timezone.now())
            )
        return Assignment.objects.filter(is_deleted=False)

    def update(self, request, *args, **kwargs):
        if getattr(request.user, "role", "") != "teacher":
            return Response({"detail": "Only the teacher who created this assignment can edit it."}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "role", "") not in {"teacher", "admin"}:
            return Response({"detail": "You do not have permission to delete assignments."}, status=403)
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        assignment = serializer.save()
        log_action(self.request.user, "updated", assignment, f"Assignment {assignment.assignment_number}: {assignment.title}")
        if assignment.status == Assignment.STATUS_ACTIVE:
            for student in User.objects.filter(role="student", is_active=True, course__iexact=assignment.program).filter(Q(semester=assignment.semester) | Q(semester__isnull=True)):
                notify_user(
                    student,
                    "Assignment updated",
                    f"{assignment.title} has been updated by your teacher.",
                    link=f"assignment:{assignment.id}",
                    email_subject="Assignment updated",
                    email_message=(
                        f"An assignment has been updated.\n\n"
                        f"Assignment No: {assignment.assignment_number}\n"
                        f"Title: {assignment.title}\n"
                        f"Deadline: {assignment.due_date.date()}"
                    ),
                )
        else:
            Notification.objects.filter(
                link=f"assignment:{assignment.id}",
                title__in=["New assignment published", "Assignment updated"],
            ).delete()
            Notification.objects.filter(
                title="New assignment published",
                message=f"{assignment.title} is now available.",
            ).delete()
            Notification.objects.filter(
                title="Assignment updated",
                message=f"{assignment.title} has been updated by your teacher.",
            ).delete()

    def perform_destroy(self, instance):
        log_delete_action(self.request.user, instance, f"Assignment {instance.assignment_number}: {instance.title}")
        if instance.status == Assignment.STATUS_ACTIVE:
            for student in User.objects.filter(role="student", is_active=True, course__iexact=instance.program).filter(Q(semester=instance.semester) | Q(semester__isnull=True)):
                notify_user(
                    student,
                    "Assignment removed",
                    f"{instance.title} is no longer available.",
                    email_subject="Assignment removed",
                    email_message=f"Assignment No: {instance.assignment_number}\nTitle: {instance.title}\n\nThis assignment is no longer available.",
                )
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])


class AssignmentMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = AssignmentMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_assignment(self):
        return generics.get_object_or_404(Assignment, pk=self.kwargs["pk"])

    def can_access(self, assignment):
        user = self.request.user
        if getattr(user, "role", "") == "admin":
            return True
        if getattr(user, "role", "") == "teacher":
            return assignment.created_by_id == user.id
        if getattr(user, "role", "") == "student":
            semester_matches = not user.semester or assignment.semester == user.semester
            return assignment.status == Assignment.STATUS_ACTIVE and not assignment.is_deleted and assignment.program.lower() == (user.course or "").strip().lower() and semester_matches
        return False

    def get_queryset(self):
        assignment = self.get_assignment()
        if not self.can_access(assignment):
            return assignment.messages.none()
        return assignment.messages.select_related("sender")

    def create(self, request, *args, **kwargs):
        assignment = self.get_assignment()
        if not self.can_access(assignment):
            return Response({"detail": "You do not have access to this discussion."}, status=403)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        assignment = self.get_assignment()
        message = serializer.save(assignment=assignment, sender=self.request.user)
        log_action(self.request.user, "messaged", assignment, f"Discussion message on assignment {assignment.assignment_number}")
        if getattr(self.request.user, "role", "") == "student":
            notify_user(
                assignment.created_by,
                "New assignment message",
                f"{self.request.user.get_full_name() or self.request.user.username} sent a message on {assignment.title}.",
                link=f"assignment:{assignment.id}",
            )
        elif getattr(self.request.user, "role", "") == "teacher":
            student_ids = assignment.messages.filter(sender__role="student").values_list("sender_id", flat=True).distinct()
            for student in User.objects.filter(id__in=student_ids):
                notify_user(
                    student,
                    "Teacher replied",
                    f"{assignment.title} has a new teacher reply.",
                    link=f"assignment:{assignment.id}",
                )

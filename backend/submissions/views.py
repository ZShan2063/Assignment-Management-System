from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Submission
from .serializers import SubmissionSerializer
from audit.utils import log_action
from notifications.utils import notify_user


class SubmissionListCreateView(generics.ListCreateAPIView):
    queryset = Submission.objects.select_related("assignment", "student").all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_student():
            return self.queryset.filter(student=user, assignment__is_deleted=False)
        elif user.is_teacher():
            return self.queryset.filter(assignment__created_by=user, assignment__is_deleted=False)
        return self.queryset.filter(assignment__is_deleted=False)

    def create(self, request, *args, **kwargs):
        if not request.user.is_student():
            return Response({"detail": "Only students can submit assignments."}, status=403)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        assignment = serializer.validated_data["assignment"]
        is_late = assignment.due_date < timezone.now()
        last_attempt = Submission.objects.filter(assignment=assignment, student=self.request.user).order_by("-attempt_number").first()
        attempt_number = (last_attempt.attempt_number + 1) if last_attempt else 1
        submission = serializer.save(student=self.request.user, is_late=is_late, attempt_number=attempt_number)
        log_action(self.request.user, "submitted", submission, f"Attempt {attempt_number} for {assignment.title}")
        student_name = self.request.user.get_full_name() or self.request.user.username
        notify_user(
            assignment.created_by,
            "New assignment submission",
            f"{student_name} submitted {assignment.title} (attempt {attempt_number}).",
            email_subject="New assignment submission",
            email_message=(
                f"{student_name} submitted an assignment.\n\n"
                f"Assignment No: {assignment.assignment_number}\n"
                f"Title: {assignment.title}\n"
                f"Attempt: {attempt_number}\n"
                f"Late: {'Yes' if is_late else 'No'}"
            ),
        )


class SubmissionDetailView(generics.RetrieveUpdateAPIView):
    queryset = Submission.objects.select_related("assignment", "student").all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_student():
            return self.queryset.filter(student=user, assignment__is_deleted=False)
        elif user.is_teacher():
            return self.queryset.filter(assignment__created_by=user, assignment__is_deleted=False)
        return self.queryset.filter(assignment__is_deleted=False)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check if trying to grade and if user is the assignment creator
        if ('score' in request.data or 'feedback' in request.data) and instance.assignment.created_by != request.user:
            return Response({"detail": "You can only grade submissions for assignments you created."}, status=403)
        if request.user.is_student() and ('score' in request.data or 'feedback' in request.data):
            return Response({"detail": "Students cannot grade submissions."}, status=403)
        if request.user.is_student() and instance.student != request.user:
            return Response({"detail": "You can only update your own submission."}, status=403)
        response = super().update(request, *args, **kwargs)
        if 'score' in request.data or 'feedback' in request.data:
            log_action(request.user, "graded", instance, f"{instance.assignment.title} for {instance.student.username}")
            score_text = f" Score: {instance.score}." if instance.score is not None else ""
            notify_user(
                instance.student,
                "Submission graded",
                f"Your submission for {instance.assignment.title} has been graded.{score_text}",
                email_subject="Your submission has been graded",
                email_message=(
                    f"Your submission has been graded.\n\n"
                    f"Assignment No: {instance.assignment.assignment_number}\n"
                    f"Title: {instance.assignment.title}\n"
                    f"Score: {instance.score if instance.score is not None else 'Not set'}\n"
                    f"Feedback: {instance.feedback or 'No feedback provided.'}"
                ),
            )
        return response

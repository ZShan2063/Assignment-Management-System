from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q
from django.utils import timezone

from assignments.models import Assignment
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        if getattr(self.request.user, "role", "") != "student":
            return queryset

        now = timezone.now()
        active_visible_assignments = Assignment.objects.filter(
            status=Assignment.STATUS_ACTIVE,
            program__iexact=(self.request.user.course or "").strip(),
            is_deleted=False,
        ).filter(
            Q(semester=self.request.user.semester) | Q(pk__isnull=False, semester__isnull=True) if self.request.user.semester else Q()
        ).filter(
            Q(due_date__gte=now) |
            Q(allow_late_submission=True, late_submission_until__isnull=True) |
            Q(allow_late_submission=True, late_submission_until__gte=now)
        )
        inactive_assignments = Assignment.objects.exclude(id__in=active_visible_assignments.values("id"))
        stale_ids = []
        for assignment in inactive_assignments:
            stale_ids.extend(
                queryset.filter(
                    link=f"assignment:{assignment.id}",
                    title__in=["New assignment published", "Assignment updated"],
                ).values_list("id", flat=True)
            )
            stale_ids.extend(
                queryset.filter(
                    title="New assignment published",
                    message=f"{assignment.title} is now available.",
                ).values_list("id", flat=True)
            )
            stale_ids.extend(
                queryset.filter(
                    title="Assignment updated",
                    message=f"{assignment.title} has been updated by your teacher.",
                ).values_list("id", flat=True)
            )
        return queryset.exclude(id__in=stale_ids)


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        Notification.objects.filter(pk=pk, recipient=request.user).update(is_read=True)
        return Response({"status": "read"})

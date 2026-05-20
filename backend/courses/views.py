from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone

from audit.utils import log_action, log_delete_action
from .models import Course, Program, Semester
from .serializers import CourseSerializer, ProgramSerializer, SemesterSerializer


def is_admin_user(user):
    return user.role == "admin" or user.is_superuser


class SemesterListView(generics.ListAPIView):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [permissions.IsAuthenticated]


class CourseListView(generics.ListCreateAPIView):
    queryset = Course.objects.filter(is_deleted=False)
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        log_action(request.user, "created", Course.objects.get(pk=response.data["id"]), response.data.get("name", ""))
        return response


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.filter(is_deleted=False)
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        log_action(request.user, "updated", self.get_object(), response.data.get("name", ""))
        return response

    def destroy(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        log_delete_action(request.user, instance, instance.name)
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProgramListCreateView(generics.ListCreateAPIView):
    queryset = Program.objects.filter(is_deleted=False)
    serializer_class = ProgramSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        log_action(request.user, "created", Program.objects.get(pk=response.data["id"]), response.data.get("name", ""))
        return response


class ProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Program.objects.filter(is_deleted=False)
    serializer_class = ProgramSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        log_action(request.user, "updated", self.get_object(), response.data.get("name", ""))
        return response

    def destroy(self, request, *args, **kwargs):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        log_delete_action(request.user, instance, instance.name)
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

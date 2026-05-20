from django.urls import path

from .views import CourseDetailView, CourseListView, ProgramDetailView, ProgramListCreateView, SemesterListView

urlpatterns = [
    path("semesters/", SemesterListView.as_view(), name="semester-list"),
    path("programs/", ProgramListCreateView.as_view(), name="program-list"),
    path("programs/<int:pk>/", ProgramDetailView.as_view(), name="program-detail"),
    path("", CourseListView.as_view(), name="course-list"),
    path("<int:pk>/", CourseDetailView.as_view(), name="course-detail"),
]

from django.urls import path

from .views import SubmissionDetailView, SubmissionListCreateView

urlpatterns = [
    path("", SubmissionListCreateView.as_view(), name="submission-list-create"),
    path("<int:pk>/", SubmissionDetailView.as_view(), name="submission-detail"),
]

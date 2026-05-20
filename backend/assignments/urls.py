from django.urls import path

from .views import AssignmentDetailView, AssignmentListCreateView, AssignmentMessageListCreateView

urlpatterns = [
    path("", AssignmentListCreateView.as_view(), name="assignment-list-create"),
    path("<int:pk>/messages/", AssignmentMessageListCreateView.as_view(), name="assignment-messages"),
    path("<int:pk>/", AssignmentDetailView.as_view(), name="assignment-detail"),
]

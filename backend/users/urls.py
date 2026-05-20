from django.urls import path

from .views import AdminUserDetailView, AdminUserListCreateView, ChangePasswordView, CurrentUserView, ForgotPasswordView, LoginView, RegisterView, ResetPasswordView, StudentAccountSetupView, VerifyEmailView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("student/create-account/", StudentAccountSetupView.as_view(), name="student-create-account"),
    path("login/", LoginView.as_view(), name="login"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("me/password/", ChangePasswordView.as_view(), name="change-password"),
    path("admin/users/", AdminUserListCreateView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]

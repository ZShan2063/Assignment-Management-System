from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import BadHeaderError
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import secrets
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

from audit.utils import log_action, log_delete_action
from notifications.utils import notify_user
from .models import EmailVerificationToken, PasswordResetToken
from .serializers import RegisterSerializer, UserSerializer, validate_email_unique, validate_mobile_unique, validate_student_enrollment, validate_teacher_id

User = get_user_model()


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


def password_error_response(password, user=None):
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return Response({"detail": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
    return None


def send_verification_email(request, user):
    if not user.email:
        return
    token = EmailVerificationToken.objects.create(user=user, token=secrets.token_urlsafe(32))
    frontend_url = request.data.get("frontend_url", "").rstrip("/") or request.headers.get("Origin", "").rstrip("/") or "http://localhost:5173"
    verify_url = f"{frontend_url}/verify-email?token={token.token}"
    EmailMultiAlternatives(
        "Verify your Assignment Management System email",
        (
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Verify your email here: {verify_url}\n\n"
            "This link expires in 24 hours."
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    ).send(fail_silently=True)


def is_admin_user(user):
    return user.role == "admin" or user.is_superuser


def serializer_validation_response(exc):
    detail = getattr(exc, "detail", None)
    return Response(detail or {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "Student accounts must be created from an admin-issued enrollment number."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def perform_create(self, serializer):
        user = serializer.save()
        Token.objects.get_or_create(user=user)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data["role"] = "student"
        data["teacher_id"] = ""
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        user = User.objects.get(username=serializer.data["username"])
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"user": serializer.data, "token": token.key}, status=status.HTTP_201_CREATED, headers=headers)


@method_decorator(csrf_exempt, name="dispatch")
class StudentAccountSetupView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        enrollment_number = request.query_params.get("username")
        if not enrollment_number:
            return Response({"username": ["Enrollment number is required."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=enrollment_number, role="student")
        except User.DoesNotExist:
            return Response({"detail": "Enrollment number was not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "username": user.username,
            "email": user.email,
            "mobile_number": user.mobile_number,
            "course": user.course,
            "account_created": user.has_usable_password(),
        })

    def post(self, request):
        enrollment_number = request.data.get("username")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        if not enrollment_number:
            return Response({"username": ["Enrollment number is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"password": ["Password is required."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=enrollment_number, role="student")
        except User.DoesNotExist:
            return Response({"detail": "Enrollment number was not found."}, status=status.HTTP_404_NOT_FOUND)
        if user.has_usable_password():
            return Response({"detail": "This student account is already created. Please login."}, status=status.HTTP_400_BAD_REQUEST)
        password_error = password_error_response(password, user)
        if password_error:
            return password_error
        user.first_name = first_name
        user.last_name = last_name
        user.email_verified = False
        user.set_password(password)
        user.save()
        send_verification_email(request, user)
        log_action(user, "activated", user, "Student created account password")
        return Response({"detail": "Account created successfully. Please verify your email before login."})


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password")
        role = request.data.get("role", "").strip()
        auth_username = username
        if role == "teacher":
            teacher = User.objects.filter(teacher_id=username, role="teacher", is_active=True).first()
            if not teacher:
                return Response({"detail": "Invalid teacher ID or password."}, status=status.HTTP_401_UNAUTHORIZED)
            auth_username = teacher.username
        user = authenticate(request, username=auth_username, password=password)
        if not user:
            return Response({"detail": "Invalid teacher ID or password." if role == "teacher" else "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if role and user.role != role and not (role == "admin" and user.is_superuser):
            return Response({"detail": f"This account is not registered as a {role}."}, status=status.HTTP_403_FORBIDDEN)
        if user.role == "student" and not user.email_verified:
            return Response({"detail": "Please verify your email before login."}, status=status.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"user": UserSerializer(user).data, "token": token.key})


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request):
        user = request.user
        username = request.data.get("username")
        if username and username != user.username:
            if User.objects.filter(username=username).exclude(pk=user.pk).exists():
                return Response({"username": ["This username is already taken."]}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.address = request.data.get("address", user.address)
        if "email_notifications_enabled" in request.data:
            user.email_notifications_enabled = bool(request.data.get("email_notifications_enabled"))
        if "deadline_reminders_enabled" in request.data:
            user.deadline_reminders_enabled = bool(request.data.get("deadline_reminders_enabled"))
        user.save(update_fields=["username", "first_name", "last_name", "address", "email_notifications_enabled", "deadline_reminders_enabled"])
        log_action(request.user, "updated", user, "User updated profile details")
        return Response(UserSerializer(user).data)


@method_decorator(csrf_exempt, name="dispatch")
class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_value = request.data.get("token", "").strip()
        if not token_value:
            return Response({"detail": "Verification token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = EmailVerificationToken.objects.select_related("user").get(token=token_value)
        except EmailVerificationToken.DoesNotExist:
            return Response({"detail": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)
        if not token.is_valid():
            return Response({"detail": "This verification link is expired or already used."}, status=status.HTTP_400_BAD_REQUEST)
        token.user.email_verified = True
        token.user.save(update_fields=["email_verified"])
        token.used_at = timezone.now()
        token.save(update_fields=["used_at"])
        log_action(token.user, "verified_email", token.user, "Student verified email")
        return Response({"detail": "Email verified successfully. You can login now."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get("password")
        if not password:
            return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        password_error = password_error_response(password, request.user)
        if password_error:
            return password_error
        request.user.set_password(password)
        request.user.save()
        log_action(request.user, "changed_password", request.user, "User changed password")
        return Response({"detail": "Password changed successfully."})


@method_decorator(csrf_exempt, name="dispatch")
class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def get(self, request):
        role = request.query_params.get("role", "").strip()
        identifier = request.query_params.get("identifier", "").strip()
        if role not in {"student", "teacher"}:
            return Response({"detail": "Only student and teacher email lookup is supported."}, status=status.HTTP_400_BAD_REQUEST)
        if not identifier:
            return Response({"detail": "Identifier is required."}, status=status.HTTP_400_BAD_REQUEST)
        if role == "student":
            user = User.objects.filter(username=identifier, role="student").first()
        else:
            user = User.objects.filter(teacher_id=identifier, role="teacher").first()
        if not user:
            return Response({"detail": "Account was not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "email": user.email,
            "username": user.username,
            "role": user.role,
        })

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        role = request.data.get("role", "").strip()
        email = request.data.get("email", "").strip()
        if not identifier:
            return Response({"detail": "Identifier is required."}, status=status.HTTP_400_BAD_REQUEST)
        if role == "student":
            user = User.objects.filter(username=identifier, role="student").first()
        elif role == "teacher":
            user = User.objects.filter(teacher_id=identifier, role="teacher").first()
        elif role == "admin":
            if not email:
                return Response({"detail": "Admin email is required."}, status=status.HTTP_400_BAD_REQUEST)
            user = User.objects.filter(username=identifier, email=email).filter(role="admin").first()
        else:
            return Response({"detail": "Valid account type is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not user:
            return Response({"detail": "If the account exists, a reset link has been sent."})
        log_action(user, "requested_password_reset", user, "Password reset email requested")
        token = PasswordResetToken.objects.create(user=user, token=secrets.token_urlsafe(32))
        reset_link = request.data.get("frontend_url", "").rstrip("/") or "http://localhost:5173"
        reset_url = f"{reset_link}/reset-password?token={token.token}"
        if not user.email:
            return Response({"detail": "This account does not have a registered email address."}, status=status.HTTP_400_BAD_REQUEST)
        user_name = user.get_full_name() or user.username
        plain_message = (
            f"Hello {user_name},\n\n"
            "We received a request to reset your Assignment Management System password.\n\n"
            f"Reset your password here: {reset_url}\n\n"
            "This link expires in 1 hour. If you did not request this, you can ignore this email."
        )
        html_message = f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="color:#4338ca">Assignment Management System</h2>
          <p>Hello {user_name},</p>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="{reset_url}" style="display:inline-block;background:#4b3bd6;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Reset Password
            </a>
          </p>
          <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        </div>
        """
        try:
            email_message = EmailMultiAlternatives(
                "Reset your Assignment Management System password",
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
            email_message.attach_alternative(html_message, "text/html")
            email_message.send(fail_silently=False)
        except BadHeaderError:
            return Response({"detail": "Invalid email header."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {"detail": "Email could not be sent. Please check backend SMTP settings."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"detail": "If the account exists, a reset link has been sent."})


@method_decorator(csrf_exempt, name="dispatch")
class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        token_value = request.data.get("token", "").strip()
        password = request.data.get("password", "")
        if not token_value:
            return Response({"detail": "Reset token is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return Response({"detail": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST)
        if not reset_token.is_valid():
            return Response({"detail": "This reset link is expired or already used."}, status=status.HTTP_400_BAD_REQUEST)
        password_error = password_error_response(password, reset_token.user)
        if password_error:
            return password_error
        reset_token.user.set_password(password)
        reset_token.user.save()
        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=["used_at"])
        log_action(reset_token.user, "reset_password", reset_token.user, "Password reset completed with email token")
        return Response({"detail": "Password reset successfully. Please login."})


class AdminUserListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_active=True).order_by("role", "username")
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Token.objects.get_or_create(user=user)
        log_action(request.user, "created", user, f"Admin created {user.role} {user.username}")
        if user.email:
            if user.role == "teacher":
                notify_user(
                    user,
                    "Teacher account created",
                    f"Your teacher account has been created. Teacher ID: {user.teacher_id or '-'}",
                    email_subject="Teacher account created",
                    email_message=f"Your teacher account has been created.\n\nTeacher ID: {user.teacher_id or '-'}\nUsername: {user.username}",
                )
            elif user.role == "student":
                notify_user(
                    user,
                    "Student enrollment registered",
                    f"Your enrollment number is {user.username}. Use it to create your student account.",
                    email_subject="Student enrollment registered",
                    email_message=f"Your enrollment has been registered.\n\nEnrollment Number: {user.username}\nProgram: {user.course or '-'}",
                )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_user(self, pk):
        return generics.get_object_or_404(User, pk=pk, is_active=True)

    def patch(self, request, pk):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_user(pk)
        next_username = request.data.get("username")
        if next_username and next_username != user.username:
            if User.objects.filter(username=next_username).exclude(pk=user.pk).exists():
                return Response({"username": ["This username is already taken."]}, status=status.HTTP_400_BAD_REQUEST)
        next_teacher_id = request.data.get("teacher_id")
        if next_teacher_id and next_teacher_id != user.teacher_id:
            try:
                validate_teacher_id(next_teacher_id, user)
            except DRFValidationError as exc:
                return serializer_validation_response(exc)
        next_email = request.data.get("email")
        if next_email and next_email != user.email:
            try:
                validate_email_unique(next_email, user)
            except DRFValidationError as exc:
                return serializer_validation_response(exc)
        next_mobile = request.data.get("mobile_number")
        if next_mobile and next_mobile != user.mobile_number:
            try:
                validate_mobile_unique(next_mobile, user)
            except DRFValidationError as exc:
                return serializer_validation_response(exc)
        next_role = request.data.get("role", user.role)
        next_username_for_role = next_username or user.username
        if next_role == "student":
            try:
                validate_student_enrollment(next_username_for_role)
            except DRFValidationError as exc:
                return serializer_validation_response(exc)
        allowed_fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "course",
            "semester",
            "teacher_id",
            "mobile_number",
            "gender",
            "date_of_birth",
            "religion",
            "address",
            "assigned_subjects",
        ]
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field] or None)
        if request.data.get("password"):
            password_error = password_error_response(request.data["password"], user)
            if password_error:
                return password_error
            user.set_password(request.data["password"])
        user.save()
        log_action(request.user, "updated", user, f"Admin updated {user.role} {user.username}")
        if user.email:
            notify_user(
                user,
                "Account updated",
                "Your account details were updated by the administrator.",
                email_subject="Account updated",
                email_message="Your Assignment Management System account details were updated by the administrator.",
            )
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        if not is_admin_user(request.user):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.pk == pk:
            return Response({"detail": "You cannot delete your own admin account."}, status=status.HTTP_400_BAD_REQUEST)
        user = self.get_user(pk)
        log_delete_action(request.user, user, f"Admin deleted {user.role} {user.username}")
        user.is_active = False
        user.deleted_at = timezone.now()
        user.save(update_fields=["is_active", "deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

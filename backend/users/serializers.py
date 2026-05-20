from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
import re

User = get_user_model()

ENROLLMENT_START = 1000000001


def release_inactive_identity_conflicts(username=None, teacher_id=None):
    timestamp = int(timezone.now().timestamp())
    if username:
        for user in User.objects.filter(username=username, is_active=False):
            user.username = f"deleted-{user.pk}-{timestamp}-{user.username}"[:150]
            user.save(update_fields=["username"])
    if teacher_id:
        for user in User.objects.filter(teacher_id=teacher_id, is_active=False):
            user.teacher_id = f"DEL{user.pk}{timestamp}"[:20]
            user.save(update_fields=["teacher_id"])


def validate_email_unique(email, instance=None):
    if email and User.objects.filter(email__iexact=email, is_active=True).exclude(pk=getattr(instance, "pk", None)).exists():
        raise serializers.ValidationError({"email": ["This email is already registered."]})


def validate_mobile_unique(mobile_number, instance=None):
    if not mobile_number:
        return
    if not re.fullmatch(r"\d{10,15}", str(mobile_number)):
        raise serializers.ValidationError({"mobile_number": ["Phone number must contain 10 to 15 digits."]})
    if User.objects.filter(mobile_number=mobile_number, is_active=True).exclude(pk=getattr(instance, "pk", None)).exists():
        raise serializers.ValidationError({"mobile_number": ["This phone number is already registered."]})


def validate_student_enrollment(username):
    if not str(username).isdigit():
        raise serializers.ValidationError({"username": ["Enrollment number must contain digits only."]})
    if int(username) < ENROLLMENT_START:
        raise serializers.ValidationError({"username": [f"Enrollment number must start from {ENROLLMENT_START}."]})


def validate_teacher_id(teacher_id, instance=None):
    if not teacher_id:
        raise serializers.ValidationError({"teacher_id": ["Teacher ID is required for teachers."]})
    if not re.fullmatch(r"T\d{3,}", str(teacher_id)):
        raise serializers.ValidationError({"teacher_id": ["Teacher ID must look like T001, T002, etc."]})
    if User.objects.filter(teacher_id=teacher_id, is_active=True).exclude(pk=getattr(instance, "pk", None)).exists():
        raise serializers.ValidationError({"teacher_id": ["This teacher ID is already taken."]})


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        if obj.is_superuser:
            return "admin"
        return obj.role

    class Meta:
        model = User
        fields = [
            "id",
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
            "email_verified",
            "email_notifications_enabled",
            "deadline_reminders_enabled",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
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
            "password",
        ]
        extra_kwargs = {
            "username": {"validators": []},
        }

    def validate(self, attrs):
        role = attrs.get('role')
        errors = {}
        username = attrs.get("username", "")

        try:
            validate_email_unique(attrs.get("email"))
        except serializers.ValidationError as exc:
            errors.update(exc.detail)

        try:
            validate_mobile_unique(attrs.get("mobile_number"))
        except serializers.ValidationError as exc:
            errors.update(exc.detail)

        if role == "student":
            try:
                validate_student_enrollment(username)
            except serializers.ValidationError as exc:
                for key, value in exc.detail.items():
                    errors["enrollment_number" if key == "username" else key] = value
            if username and User.objects.filter(username=username, is_active=True).exists():
                errors["enrollment_number"] = ["This enrollment number is already registered."]
        elif username and User.objects.filter(username=username, is_active=True).exists():
            errors["username"] = ["This username is already taken."]

        if role == 'teacher':
            try:
                validate_teacher_id(attrs.get("teacher_id"))
            except serializers.ValidationError as exc:
                errors.update(exc.detail)

        if role != 'student' and not attrs.get("password"):
            errors["password"] = ["Password is required."]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        release_inactive_identity_conflicts(
            username=validated_data.get("username"),
            teacher_id=validated_data.get("teacher_id"),
        )
        if validated_data.get('role') == 'student':
            validated_data['teacher_id'] = None
        password = validated_data.pop("password", "")
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

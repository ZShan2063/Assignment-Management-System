from django.contrib.auth import get_user_model
from rest_framework import serializers
import re

User = get_user_model()

ENROLLMENT_START = 1000000001


def validate_email_unique(email, instance=None):
    if email and User.objects.filter(email__iexact=email).exclude(pk=getattr(instance, "pk", None)).exists():
        raise serializers.ValidationError({"email": ["This email is already registered."]})


def validate_mobile_unique(mobile_number, instance=None):
    if not mobile_number:
        return
    if not re.fullmatch(r"\d{10,15}", str(mobile_number)):
        raise serializers.ValidationError({"mobile_number": ["Phone number must contain 10 to 15 digits."]})
    if User.objects.filter(mobile_number=mobile_number).exclude(pk=getattr(instance, "pk", None)).exists():
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
    if User.objects.filter(teacher_id=teacher_id).exclude(pk=getattr(instance, "pk", None)).exists():
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
            'username': {'error_messages': {'unique': 'This enrollment number is already registered. Please choose a different one.'}},
        }

    def validate(self, attrs):
        role = attrs.get('role')
        validate_email_unique(attrs.get("email"))
        validate_mobile_unique(attrs.get("mobile_number"))
        if role == "student":
            validate_student_enrollment(attrs.get("username", ""))
        if role == 'teacher':
            validate_teacher_id(attrs.get("teacher_id"))
        if role != 'student' and not attrs.get("password"):
            raise serializers.ValidationError("Password is required.")
        return attrs

    def create(self, validated_data):
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

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification


def send_user_email(user, subject, message):
    if not getattr(user, "email", "") or not getattr(user, "email_notifications_enabled", True):
        return 0
    return send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def notify_user(user, title, message, link=None, email_subject=None, email_message=None):
    Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        link=link or "",
    )
    return send_user_email(user, email_subject or title, email_message or message)

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_email_preferences_and_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="assigned_subjects",
            field=models.TextField(blank=True, default="", help_text="Comma-separated subject codes this teacher can create assignments for."),
        ),
        migrations.AddField(
            model_name="user",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

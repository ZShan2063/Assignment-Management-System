from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assignments", "0005_late_submission_controls"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="status",
            field=models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("closed", "Closed")], default="active", max_length=16),
        ),
    ]

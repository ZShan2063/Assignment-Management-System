from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assignments", "0006_assignment_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="allow_resubmission",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="assignment",
            name="max_attempts",
            field=models.PositiveIntegerField(default=3),
        ),
    ]

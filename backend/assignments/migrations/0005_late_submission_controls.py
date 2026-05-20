from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assignments", "0004_assignment_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="allow_late_submission",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="assignment",
            name="late_penalty_points",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="assignment",
            name="late_submission_note",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("submissions", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="attempt_number",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddConstraint(
            model_name="submission",
            constraint=models.UniqueConstraint(fields=("assignment", "student", "attempt_number"), name="unique_submission_attempt_per_student"),
        ),
    ]

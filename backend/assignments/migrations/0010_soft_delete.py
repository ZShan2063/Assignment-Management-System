from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("assignments", "0009_assignmentmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="assignment",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

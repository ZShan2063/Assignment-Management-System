from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0003_seed_programs"),
    ]

    operations = [
        migrations.AddField(
            model_name="program",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="program",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="course",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="course",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

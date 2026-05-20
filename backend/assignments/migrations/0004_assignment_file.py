from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assignments", "0003_assignment_number"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="assignment_file",
            field=models.FileField(blank=True, null=True, upload_to="assignments/%Y/%m/%d/"),
        ),
    ]

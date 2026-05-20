from django.db import migrations, models


def fill_assignment_numbers(apps, schema_editor):
    Assignment = apps.get_model("assignments", "Assignment")
    teacher_ids = Assignment.objects.values_list("created_by_id", flat=True).distinct()
    for teacher_id in teacher_ids:
        assignments = Assignment.objects.filter(created_by_id=teacher_id).order_by("created_at", "id")
        for index, assignment in enumerate(assignments):
            assignment.assignment_number = 10001 + index
            assignment.save(update_fields=["assignment_number"])


class Migration(migrations.Migration):

    dependencies = [
        ("assignments", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="assignment_number",
            field=models.PositiveIntegerField(default=10001),
        ),
        migrations.RunPython(fill_assignment_numbers, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="assignment",
            constraint=models.UniqueConstraint(fields=("created_by", "assignment_number"), name="unique_assignment_number_per_teacher"),
        ),
    ]

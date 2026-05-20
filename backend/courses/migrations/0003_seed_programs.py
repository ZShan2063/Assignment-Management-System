from django.db import migrations


DEFAULT_PROGRAMS = ["BCA", "BBA", "B.Tech", "MCA", "MBA", "M.Tech"]


def seed_programs(apps, schema_editor):
    Program = apps.get_model("courses", "Program")
    for name in DEFAULT_PROGRAMS:
        Program.objects.get_or_create(name=name)


def unseed_programs(apps, schema_editor):
    Program = apps.get_model("courses", "Program")
    Program.objects.filter(name__in=DEFAULT_PROGRAMS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("courses", "0002_program_alter_course_program"),
    ]

    operations = [
        migrations.RunPython(seed_programs, unseed_programs),
    ]

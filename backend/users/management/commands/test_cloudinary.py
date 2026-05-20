from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Uploads and deletes a small test file using the configured default storage."

    def handle(self, *args, **options):
        path = "storage-tests/ams-cloudinary-test.txt"
        saved_path = default_storage.save(path, ContentFile(b"Assignment Management System storage test"))
        exists = default_storage.exists(saved_path)
        default_storage.delete(saved_path)
        if not exists:
            raise RuntimeError("Storage test file was not found after upload.")
        self.stdout.write(self.style.SUCCESS(f"Storage upload test passed using {default_storage.__class__.__name__}."))

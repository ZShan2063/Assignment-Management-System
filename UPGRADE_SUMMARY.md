# AMS Upgrade Summary

This folder is a separate upgraded copy of the original `AssignmentManagement` project.

Original project remains here:

```text
C:\Users\Asus\Desktop\AssignmentManagement
```

Upgraded copy is here:

```text
C:\Users\Asus\Desktop\AMS
```

## Upgrades Added

### 2. File Preview
- Added `FilePreviewer.tsx`.
- Teacher assignment table can preview assignment files.
- Student active assignment cards can preview assignment files.

### 3. Assignment Status / Result Helpers
- Added result status to submission serializer.
- Added reusable status badge component.

### 4. Admin Analytics
- Added `/api/upgrades/analytics/admin/`.
- Admin overview now displays upgraded analytics.

### 5. Teacher Analytics
- Added `/api/upgrades/analytics/teacher/`.
- Teacher overview now displays assignment/submission/grading analytics.

### 6. Student Progress
- Added `/api/upgrades/analytics/student/`.
- Student overview now displays progress metrics.

### 7. Reports
- Added CSV report endpoints:
  - `/api/upgrades/reports/assignments/`
  - `/api/upgrades/reports/submissions/`
- Admin overview includes report download buttons.

### 8. Notifications
- Assignment creation sends notifications to students.
- Student submission sends notification to teacher.
- Grading sends notification to student.
- Added notification read endpoint.
- Admin, teacher, and student overview pages include notification center.

### 9. Late Submission Control
- Assignment model now includes:
  - `allow_late_submission`
  - `late_penalty_points`
  - `late_submission_note`
- Teacher create/edit assignment form includes late submission settings.
- Student submissions are blocked after deadline unless late submission is allowed.

### 10. Security Helpers
- Added throttling settings.
- Added stricter production security cookie/header settings.
- `DJANGO_ALLOWED_HOSTS` can now be controlled by environment variable.

## Verification

Backend check:

```powershell
C:\Users\Asus\Desktop\AssignmentManagement\backend\venv\Scripts\python.exe manage.py check
```

Frontend build:

```powershell
cd C:\Users\Asus\Desktop\AMS\frontend
npm run build
```

Both passed after the upgrades.


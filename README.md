# Assignment Management System

A full-stack college assignment management web application with separate panels for admin, teachers, and students.

## Tech Stack

- **Backend:** Django + Django REST Framework
- **Frontend:** React + TypeScript + Vite
- **Database:** SQLite for local development, PostgreSQL through `DATABASE_URL` for production
- **Authentication:** Token-based login with role-based routing
- **File Uploads:** Assignment files and student submission files
- **Production File Storage:** Local media by default, Cloudinary-ready for deployment

## Main Roles

### Admin
- Login as admin from the role selection page.
- Manage programs.
- Manage course/subjects by program and semester.
- Create teacher accounts with automatic Teacher ID.
- Restrict teachers to specific subject codes when needed.
- Register students with automatic enrollment number starting from `1000000001`.
- View and delete assignments.
- Deleted users, programs, course/subjects, and assignments are soft-deleted, recorded in the audit log with a record snapshot, and can be restored by admin.
- Download reports, CSV import templates, audit logs, and full JSON backups.
- Preview and restore a JSON backup from the audit/reports area.
- Search admin tables where needed.
- View dashboard analytics with visual chart cards.
- Filter audit activity by search, action, and date range.
- Download filtered assignment, submission, user, course, and audit reports.
- Change password and logout.

### Teacher
- Login with Teacher ID and password created by admin.
- View overview dashboard.
- Create assignments with automatic assignment number per teacher.
- Upload an optional assignment file.
- Select program, semester, and course/subject.
- Teachers can only create assignments for their assigned program and, when configured, their assigned subject codes.
- Manage, search, edit, and delete own assignments.
- Grade submitted assignments.
- Filter submissions by program, semester, and course/subject.
- Show pass/fail result with colored status.
- Use assignment discussion messages with students.
- Edit profile username and address.
- Change password and logout.

### Student
- Admin first registers the student's enrollment number, email, phone number, and program.
- Student creates account using the enrollment number provided by admin.
- Student sets first name, last name, and password.
- Student verifies email before login.
- Login uses enrollment number and password.
- View all active assignments sorted by assignment number.
- See only assignments for their own program and semester.
- Submit assignment files.
- View submissions, score, feedback, and pass/fail result.
- Download a personal transcript CSV from the submissions page.
- Edit first name and last name from profile.
- Change password and logout.

## Other Features

- Shared fixed header for all roles.
- Responsive left-sidebar dashboard layout.
- Automatic logout after 15 minutes of inactivity.
- Management command to close expired assignments in the database.
- Confirmation prompts before password changes and delete actions.
- Search support in teacher and admin management sections.
- Assignment numbers are separate per teacher.
- Password reset email support through SMTP.
- Student email verification after account creation.
- Notification preferences for email alerts and deadline reminders.
- Assignment discussion threads between teachers and students.
- Login and password reset rate limits.
- Health check endpoint for deployment monitoring.
- Admin-created teacher/student records validate duplicate email, duplicate phone, phone length, teacher ID format, and enrollment number format.
- Uploaded assignment/submission files are limited to PDF, DOC, DOCX, JPG, PNG, TXT, and ZIP under 10 MB.
- Password changes and resets use Django password-strength validation.
- CSV preview/import with row-level validation and downloadable templates.
- Audit log for important create, update, delete, password, import, export, and restore actions.
- Safer backup restore flow with preview counts before confirmation.
- In-app notifications with unread/read filters.
- PDF/image preview modal for uploaded files.
- Frontend smoke test script for key page/component checks.
- Render and Vercel config files included for deployment.

## Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the current folder and file layout.

## Run Locally

### Backend

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\activate
python manage.py migrate
python manage.py runserver
```

Backend API:

```text
http://127.0.0.1:8000/api/
```

Health check:

```text
http://127.0.0.1:8000/api/health/
```

### Frontend

Open another terminal:

```powershell
cd C:\Users\Asus\Desktop\AMS\frontend
npm install
npm run dev
```

Frontend app:

```text
http://localhost:5173
```

If Vite uses a different port, open the URL shown in the terminal.

## Important API Endpoints

### Users
- `GET /api/health/` - public deployment health check
- `POST /api/users/login/` - login
- `GET /api/users/me/` - current logged-in user
- `PATCH /api/users/me/` - update current user profile
- `POST /api/users/me/password/` - change password
- `GET /api/users/admin/users/` - admin list users
- `POST /api/users/admin/users/` - admin create teacher/student/admin user
- `PATCH /api/users/admin/users/<id>/` - admin update user
- `DELETE /api/users/admin/users/<id>/` - admin delete user
- `GET /api/users/student/create-account/?enrollment_number=<number>` - get student registration details
- `POST /api/users/student/create-account/` - student creates password/name
- `POST /api/users/verify-email/` - verify student email using email token
- `POST /api/users/register/` - closed; students must use admin-issued enrollment numbers

### Programs and Course/Subjects
- `GET /api/courses/programs/` - list programs
- `POST /api/courses/programs/` - create program
- `PATCH /api/courses/programs/<id>/` - update program
- `DELETE /api/courses/programs/<id>/` - delete program
- `GET /api/courses/` - list course/subjects
- `POST /api/courses/` - create course/subject
- `PATCH /api/courses/<id>/` - update course/subject
- `DELETE /api/courses/<id>/` - delete course/subject

### Assignments
- `GET /api/assignments/` - list assignments
- `POST /api/assignments/` - teacher creates assignment
- `PATCH /api/assignments/<id>/` - update assignment
- `DELETE /api/assignments/<id>/` - delete assignment
- `GET /api/assignments/<id>/messages/` - list assignment discussion messages
- `POST /api/assignments/<id>/messages/` - send assignment discussion message

### Submissions
- `GET /api/submissions/` - list submissions
- `POST /api/submissions/` - student submits work
- `PATCH /api/submissions/<id>/` - teacher grades submission

### Upgrades
- `GET /api/upgrades/reports/backup/` - admin download full JSON backup
- `POST /api/upgrades/reports/backup/restore/?preview=true` - admin preview JSON backup restore
- `POST /api/upgrades/reports/backup/restore/` - admin restore JSON backup with `confirm=RESTORE`
- `GET /api/upgrades/audit/?search=&action=&date_from=&date_to=` - admin audit log with filters
- `GET /api/upgrades/deleted-records/` - admin list soft-deleted records
- `POST /api/upgrades/deleted-records/restore/` - admin restore a soft-deleted record
- `GET /api/upgrades/reports/assignments/?search=&program=&status=&teacher=&date_from=&date_to=` - admin filtered assignment report
- `GET /api/upgrades/reports/submissions/?search=&program=&teacher=&result=&date_from=&date_to=` - admin filtered submission report
- `GET /api/upgrades/reports/student-transcript/` - student download personal transcript CSV
- `GET /api/upgrades/imports/students/template/` - admin download student CSV template
- `GET /api/upgrades/imports/teachers/template/` - admin download teacher CSV template
- `POST /api/upgrades/imports/students/?preview=true` - preview student CSV import
- `POST /api/upgrades/imports/teachers/?preview=true` - preview teacher CSV import

## GitHub Upload Notes

Before uploading to GitHub, keep generated/local files out of the repository:

```text
backend/venv/
frontend/node_modules/
frontend/dist/
backend/db.sqlite3
__pycache__/
*.pyc
```

## Deployment Summary

For a live website:

- Deploy Django backend to a service like Render.
- Use PostgreSQL for production by setting `DATABASE_URL`.
- Deploy React frontend to Vercel or Netlify.
- Set the frontend API URL to the deployed backend URL.
- Copy `backend/.env.example` to `.env` and set Django `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, SMTP email settings, and secret environment variables.
- For persistent production uploads, set `CLOUDINARY_URL`. Without Cloudinary or another storage service, Render local uploads may be lost when the service restarts.

Render can use this health endpoint:

```text
/api/health/
```

The backend automatically switches from SQLite to PostgreSQL when `DATABASE_URL` is set.

## Verification

Backend:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test
```

Utility commands:

```powershell
python manage.py export_backup --output backups
python manage.py send_deadline_reminders --hours 24
python manage.py close_expired_assignments
```

Frontend:

```powershell
cd C:\Users\Asus\Desktop\AMS\frontend
npm run build
npm test
```

Cloudinary/storage check:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
python manage.py test_cloudinary
```

This is a real Cloudinary upload/delete test only when `CLOUDINARY_URL` is set. Otherwise it checks the current local/default storage.

---

**Last Updated:** May 20, 2026

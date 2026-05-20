# Setup and Deployment Guide

This guide explains how to run the current Assignment Management System locally, upload it to GitHub, and prepare it for deployment.

## Required Software

Install these first:

- Python 3.8+
- Node.js 18+
- npm
- Git
- A code editor such as VS Code
- A modern browser such as Chrome or Edge

## Local Backend Setup

Open PowerShell:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend API runs at:

```text
http://127.0.0.1:8000/api/
```

The project uses SQLite by default for local development, so no external database is required.

For production, set `DATABASE_URL` to your PostgreSQL connection string. When this variable exists, Django automatically uses PostgreSQL instead of SQLite.

## Local Frontend Setup

Open a second PowerShell terminal:

```powershell
cd C:\Users\Asus\Desktop\AMS\frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Usually:

```text
http://localhost:5173
```

Keep both backend and frontend terminals running.

## First Use Workflow

1. Open the frontend in the browser.
2. Choose login role: Student, Teacher, or Admin.
3. Login as admin.
4. In the admin panel:
   - Add programs.
   - Add course/subjects under program and semester.
   - Add teachers. Teacher ID is filled automatically. Optional assigned subject codes can restrict which subjects a teacher can create assignments for.
   - Register students. Enrollment number is filled automatically.
5. Student creates an account using the enrollment number provided by admin.
6. Teacher creates assignments.
7. Student submits work.
8. Teacher grades submissions.

## Login Rules

### Admin

Admin logs in from the admin login option.

### Teacher

Teacher accounts are created by admin only. Teachers log in with their Teacher ID and password.

### Student

Students do not self-register from zero. Admin first registers:

- Enrollment number
- Email
- Phone number
- Program
- Semester, when you want assignments filtered by semester

Then the student uses Create Account to set:

- First name
- Last name
- Password

After account creation, the student must verify the email address using the verification link sent by the backend before login is allowed.

Student login uses:

- Enrollment number
- Password

## Useful Commands

### Backend tests

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py test
```

### Cloudinary/storage test

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py test_cloudinary
```

This uploads and deletes a tiny test file. It tests Cloudinary only after `CLOUDINARY_URL` is set; without that variable it tests the current local/default file storage.

## Email Setup For Password Reset

By default, password reset emails need SMTP settings. For Gmail, create an App Password from your Google account, then create this file:

```text
C:\Users\Asus\Desktop\AMS\backend\.env
```

Put these values inside it:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-gmail-address@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=your-gmail-address@gmail.com
```

Do not use your normal Gmail password. Gmail requires an App Password.

### Backend check

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py check
```

### Health check

Open this URL after the backend is running:

```text
http://127.0.0.1:8000/api/health/
```

It should return:

```json
{"status":"ok","database":"ok"}
```

### Make migrations

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py makemigrations
.\venv\Scripts\python.exe manage.py migrate
```

### Frontend build

```powershell
cd C:\Users\Asus\Desktop\AMS\frontend
npm run build
npm test
```

## GitHub Upload

Create a new GitHub repository, then run:

```powershell
cd C:\Users\Asus\Desktop\AMS
git init
git add .
git commit -m "Initial project upload"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_LINK
git push -u origin main
```

Before pushing, make sure these are ignored:

```text
backend/venv/
frontend/node_modules/
frontend/dist/
backend/db.sqlite3
__pycache__/
*.pyc
```

## Running After Cloning From GitHub

```powershell
git clone YOUR_GITHUB_REPO_LINK
cd AMS
```

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend in another terminal:

```powershell
cd AMS\frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Deployment Overview

Recommended simple deployment:

- Backend: Render
- Frontend: Vercel or Netlify
- Production database: PostgreSQL

### Backend Deployment Notes

For production:

- Set `DEBUG=False`
- Configure `ALLOWED_HOSTS`
- Configure CORS for the frontend domain
- Use environment variables for secret key and database settings
- Set `DATABASE_URL` from your Render PostgreSQL database
- Run migrations on the server
- Use Gunicorn or the hosting platform start command
- `render.yaml` and `backend/Procfile` are included as starter deployment config files.
- Use `/api/health/` as the health check path if your hosting service asks for one.

Example backend commands:

```bash
pip install -r requirements.txt
python manage.py migrate
gunicorn assignment_system.wsgi:application
```

### Frontend Deployment Notes

Build command:

```bash
npm run build
```

Output folder:

```text
dist
```

`frontend/vercel.json` is included so Vercel can route the React app correctly.

Set the frontend API URL to the deployed backend API, for example:

```text
https://your-backend-url.com/api
```

## Production Environment File

Copy:

```text
C:\Users\Asus\Desktop\AMS\backend\.env.example
```

to:

```text
C:\Users\Asus\Desktop\AMS\backend\.env
```

Then fill in your real values. Important production variables:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=your-render-app-name.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`
- `DATABASE_URL`
- SMTP email settings
- Optional `CLOUDINARY_URL` for persistent uploaded files

## CSV Import Templates

In the admin panel, open Teacher or Register Student and click `Download Template`.

The backend also provides:

```text
/api/upgrades/imports/students/template/
/api/upgrades/imports/teachers/template/
```

Always use `Preview CSV` before `Import CSV`; invalid rows show row-level errors.

## Backup And Restore

In the admin Audit Log section:

- `Download System Backup` exports users, programs, subjects, assignments, submissions, and audit logs as JSON.
- `Restore Backup JSON` first previews how many records are inside the file.
- `Confirm Restore` imports that JSON back into the system after confirmation.

Keep backup files private because they include sensitive account data.

## Admin Analytics And Audit Filters

The admin overview includes chart-style analytics for assignments, submissions, grading, pass/fail, and average score. The Audit Log page supports search plus action/date filters, and reports can be downloaded from the same area.

## Filtered Reports And Student Transcript

The admin report buttons support filters for search text, program, role, assignment status, result, and date range before downloading CSV files. Students can download their own transcript CSV from the Submissions page.

## Security Notes

Login and password reset endpoints are rate-limited. Password changes, student account creation, and reset-password flow use Django's password validators, so weak/common passwords may be rejected.

Admin user creation also validates duplicate email, duplicate phone number, phone length, teacher ID format, and enrollment number format. Delete actions are recorded in the audit log with a snapshot of the deleted record.

Deleted users, programs, course/subjects, and assignments are soft-deleted instead of permanently removed. Admin can open Audit Log, load deleted records, and restore them.

Assignment and submission uploads are limited to PDF, DOC, DOCX, JPG, PNG, TXT, and ZIP files under 10 MB.

## Discussion And Notifications

Students and teachers can use the assignment discussion box to exchange messages for a specific assignment. Users can turn email notifications and deadline reminders on or off from their profile.

To send deadline reminders manually:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py send_deadline_reminders --hours 24
```

To export a scheduled/manual backup:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py export_backup --output backups
```

To close expired assignments in the database:

```powershell
cd C:\Users\Asus\Desktop\AMS\backend
.\venv\Scripts\python.exe manage.py close_expired_assignments
```

## Cloudinary File Storage

For Render or other production hosting, local uploaded files may disappear after redeploys or restarts. To keep files permanently:

1. Create a Cloudinary account.
2. Copy your Cloudinary URL.
3. Add this environment variable to Render:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

The backend automatically uses Cloudinary when that variable is present.

## Troubleshooting

### Backend port already in use

```powershell
python manage.py runserver 8001
```

### Frontend port already in use

```powershell
npm run dev -- --port 5174
```

### Missing backend packages

```powershell
pip install -r requirements.txt
```

### Missing frontend packages

```powershell
npm install
```

### Database errors

```powershell
python manage.py makemigrations
python manage.py migrate
```

---

**Last Updated:** May 20, 2026

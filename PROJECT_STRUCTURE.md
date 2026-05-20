# Project Structure

```text
AssignmentManagement/
+-- backend/
|   +-- assignment_system/
|   |   +-- __init__.py
|   |   +-- settings.py
|   |   +-- urls.py
|   |   +-- wsgi.py
|   +-- users/
|   |   +-- models.py
|   |   +-- serializers.py
|   |   +-- views.py
|   |   +-- urls.py
|   +-- courses/
|   |   +-- models.py
|   |   +-- serializers.py
|   |   +-- views.py
|   |   +-- urls.py
|   +-- assignments/
|   |   +-- models.py
|   |   +-- serializers.py
|   |   +-- views.py
|   |   +-- urls.py
|   +-- submissions/
|   |   +-- models.py
|   |   +-- serializers.py
|   |   +-- views.py
|   |   +-- urls.py
|   +-- notifications/
|   |   +-- models.py
|   |   +-- serializers.py
|   |   +-- views.py
|   |   +-- urls.py
|   +-- manage.py
|   +-- requirements.txt
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   |   +-- AutoLogout.tsx
|   |   |   +-- ProtectedRoute.tsx
|   |   |   +-- TopBar.tsx
|   |   +-- hooks/
|   |   |   +-- useAuth.tsx
|   |   +-- pages/
|   |   |   +-- AdminDashboard.tsx
|   |   |   +-- HomePage.tsx
|   |   |   +-- LoginPage.tsx
|   |   |   +-- RegisterPage.tsx
|   |   |   +-- StudentDashboard.tsx
|   |   |   +-- TeacherDashboard.tsx
|   |   +-- services/
|   |   |   +-- api.ts
|   |   +-- types/
|   |   |   +-- index.ts
|   |   +-- App.tsx
|   |   +-- main.tsx
|   |   +-- styles.css
|   +-- index.html
|   +-- package.json
|   +-- tsconfig.json
|   +-- tsconfig.node.json
|   +-- vite.config.ts
+-- API_DOCUMENTATION.md
+-- PROJECT_STRUCTURE.md
+-- README.md
+-- SETUP_GUIDE.md
```

## Backend Apps

### `users`

Handles:

- User model with roles: student, teacher, admin
- Login
- Current user profile
- Password change
- Admin user management
- Student create-account flow using enrollment number
- Teacher ID and student enrollment data

### `courses`

Handles:

- Programs
- Course/subjects
- Semester values
- Program and semester filtering for subjects

### `assignments`

Handles:

- Teacher assignment creation
- Automatic assignment number per teacher
- Assignment file upload
- Assignment list/update/delete
- Role-based assignment visibility

### `submissions`

Handles:

- Student file submission
- Submission listing
- Teacher grading
- Score, feedback, pass/fail display data

### `notifications`

Contains notification API structure.

## Frontend Areas

### `HomePage.tsx`

Shows role choices:

- Student login
- Teacher login
- Admin login

### `LoginPage.tsx`

Handles role-based login:

- Student uses enrollment number and password
- Teacher uses username and password
- Admin uses admin credentials

### `RegisterPage.tsx`

Student account creation page. It uses admin-provided enrollment number to load student details, then lets the student set first name, last name, and password.

### `AdminDashboard.tsx`

Admin panel with:

- Overview
- Assignment management
- Program management
- Course/Subject management
- Teacher management
- Register Student
- Change Password
- Search in management sections

### `TeacherDashboard.tsx`

Teacher panel with:

- Overview
- Assignment management
- Create assignment
- Grade submissions
- Profile
- Change password

### `StudentDashboard.tsx`

Student panel with:

- Overview
- Active assignments
- Submit work
- Recent submissions
- Change password
- Profile

### `AutoLogout.tsx`

Logs out the user after 15 minutes of inactivity.

---

**Last Updated:** May 12, 2026

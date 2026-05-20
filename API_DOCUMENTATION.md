# API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

Most endpoints require authentication. Include the user ID or token in requests:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Users

#### 1. Register User
**POST** `/users/register/`

Request body:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "course": "BCA",
  "semester": 1
}
```

Response (201 Created):
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "course": "BCA",
  "semester": 1
}
```

#### 2. Login User
**POST** `/users/login/`

Request body:
```json
{
  "username": "john_doe",
  "password": "SecurePassword123"
}
```

Response (200 OK):
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "course": "BCA",
  "semester": 1
}
```

#### 3. Get Current User
**GET** `/users/me/`

Response (200 OK):
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "course": "BCA",
  "semester": 1
}
```

---

### Courses

#### 1. List Semesters
**GET** `/courses/semesters/`

Response (200 OK):
```json
[
  {
    "id": 1,
    "number": 1,
    "year": 2024
  },
  {
    "id": 2,
    "number": 2,
    "year": 2024
  }
]
```

#### 2. List All Courses
**GET** `/courses/`

Query Parameters:
- `program` (optional): Filter by program (BCA, BBA, B.Tech, MCA, MBA, M.Tech)
- `semester` (optional): Filter by semester number

Response (200 OK):
```json
[
  {
    "id": 1,
    "code": "BCA101",
    "name": "Data Structures",
    "program": "BCA",
    "semester": 1,
    "description": "Introduction to data structures"
  },
  {
    "id": 2,
    "code": "BCA102",
    "name": "Programming",
    "program": "BCA",
    "semester": 1,
    "description": "Java programming basics"
  }
]
```

#### 3. Get Course Details
**GET** `/courses/<id>/`

Response (200 OK):
```json
{
  "id": 1,
  "code": "BCA101",
  "name": "Data Structures",
  "program": "BCA",
  "semester": 1,
  "description": "Introduction to data structures"
}
```

---

### Assignments

#### 1. List All Assignments
**GET** `/assignments/`

Query Parameters:
- `course` (optional): Filter by course code
- `program` (optional): Filter by program
- `semester` (optional): Filter by semester

Response (200 OK):
```json
[
  {
    "id": 1,
    "title": "Array Implementation",
    "description": "Implement a dynamic array class",
    "course": "BCA101",
    "program": "BCA",
    "semester": 1,
    "created_by": "teacher_name",
    "due_date": "2024-05-15T23:59:59Z",
    "total_points": 100,
    "created_at": "2024-05-01T10:00:00Z",
    "updated_at": "2024-05-01T10:00:00Z"
  }
]
```

#### 2. Create Assignment (Teacher/Admin only)
**POST** `/assignments/`

Request body:
```json
{
  "title": "Linked List Implementation",
  "description": "Implement singly and doubly linked lists",
  "course": "BCA101",
  "program": "BCA",
  "semester": 1,
  "due_date": "2024-06-15T23:59:59Z",
  "total_points": 100
}
```

Response (201 Created):
```json
{
  "id": 2,
  "title": "Linked List Implementation",
  "description": "Implement singly and doubly linked lists",
  "course": "BCA101",
  "program": "BCA",
  "semester": 1,
  "created_by": "teacher1",
  "due_date": "2024-06-15T23:59:59Z",
  "total_points": 100,
  "created_at": "2024-05-10T10:00:00Z",
  "updated_at": "2024-05-10T10:00:00Z"
}
```

#### 3. Get Assignment Details
**GET** `/assignments/<id>/`

Response (200 OK):
```json
{
  "id": 1,
  "title": "Array Implementation",
  "description": "Implement a dynamic array class",
  "course": "BCA101",
  "program": "BCA",
  "semester": 1,
  "created_by": "teacher1",
  "due_date": "2024-05-15T23:59:59Z",
  "total_points": 100,
  "created_at": "2024-05-01T10:00:00Z",
  "updated_at": "2024-05-01T10:00:00Z"
}
```

#### 4. Update Assignment (Creator only)
**PUT** `/assignments/<id>/`

Request body:
```json
{
  "due_date": "2024-05-20T23:59:59Z"
}
```

Response (200 OK):
```json
{
  "id": 1,
  "title": "Array Implementation",
  "description": "Implement a dynamic array class",
  "course": "BCA101",
  "program": "BCA",
  "semester": 1,
  "created_by": "teacher1",
  "due_date": "2024-05-20T23:59:59Z",
  "total_points": 100,
  "created_at": "2024-05-01T10:00:00Z",
  "updated_at": "2024-05-10T15:00:00Z"
}
```

#### 5. Delete Assignment (Creator/Admin only)
**DELETE** `/assignments/<id>/`

Response: 204 No Content

---

### Submissions

#### 1. List Submissions
**GET** `/submissions/`

- Students see only their own submissions
- Teachers see all submissions

Query Parameters:
- `assignment` (optional): Filter by assignment ID
- `student` (optional): Filter by student (teacher only)

Response (200 OK):
```json
[
  {
    "id": 1,
    "assignment": 1,
    "assignment_title": "Array Implementation",
    "student": "john_doe",
    "uploaded_file": "/media/submissions/2024/05/10/array.py",
    "comment": "Here is my implementation",
    "submitted_at": "2024-05-15T15:30:00Z",
    "score": 85,
    "feedback": "Good implementation, minor efficiency issues",
    "graded_at": "2024-05-16T10:00:00Z",
    "is_late": false
  }
]
```

#### 2. Submit Assignment
**POST** `/submissions/`

Request body (multipart/form-data):
```
assignment: 1
uploaded_file: <binary file>
comment: "My submission for array implementation"
```

Response (201 Created):
```json
{
  "id": 1,
  "assignment": 1,
  "assignment_title": "Array Implementation",
  "student": "john_doe",
  "uploaded_file": "/media/submissions/2024/05/10/array.py",
  "comment": "My submission for array implementation",
  "submitted_at": "2024-05-15T15:30:00Z",
  "score": null,
  "feedback": "",
  "graded_at": null,
  "is_late": false
}
```

#### 3. Get Submission Details
**GET** `/submissions/<id>/`

Response (200 OK):
```json
{
  "id": 1,
  "assignment": 1,
  "assignment_title": "Array Implementation",
  "student": "john_doe",
  "uploaded_file": "/media/submissions/2024/05/10/array.py",
  "comment": "My submission for array implementation",
  "submitted_at": "2024-05-15T15:30:00Z",
  "score": null,
  "feedback": "",
  "graded_at": null,
  "is_late": false
}
```

#### 4. Grade Submission (Teacher/Admin only)
**PUT** `/submissions/<id>/`

Request body:
```json
{
  "score": 85,
  "feedback": "Good implementation, minor efficiency issues"
}
```

Response (200 OK):
```json
{
  "id": 1,
  "assignment": 1,
  "assignment_title": "Array Implementation",
  "student": "john_doe",
  "uploaded_file": "/media/submissions/2024/05/10/array.py",
  "comment": "My submission for array implementation",
  "submitted_at": "2024-05-15T15:30:00Z",
  "score": 85,
  "feedback": "Good implementation, minor efficiency issues",
  "graded_at": "2024-05-16T10:00:00Z",
  "is_late": false
}
```

---

### Notifications

#### 1. List User Notifications
**GET** `/notifications/`

Response (200 OK):
```json
[
  {
    "id": 1,
    "title": "Assignment Due Tomorrow",
    "message": "Your Array Implementation assignment is due tomorrow at 11:59 PM",
    "is_read": false,
    "created_at": "2024-05-14T10:00:00Z"
  },
  {
    "id": 2,
    "title": "Assignment Graded",
    "message": "Your Array Implementation submission has been graded. Score: 85/100",
    "is_read": true,
    "created_at": "2024-05-16T11:00:00Z"
  }
]
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message"
}
```

### Common Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Request successful, no content to return
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Example Error
```json
{
  "detail": "Invalid credentials."
}
```

---

## Rate Limiting

Not implemented in development. Production should implement rate limiting to prevent abuse.

---

## Pagination

List endpoints support pagination (to be implemented):

```
GET /assignments/?page=2&page_size=10
```

---

## Filtering and Ordering

Query parameters for filtering:

```
GET /assignments/?course=BCA101&semester=1&ordering=-due_date
```

---

**Last Updated**: May 2, 2026

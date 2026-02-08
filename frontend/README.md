# MOOC Platform - React Frontend

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure API URL (Optional)
Create a `.env` file in the `frontend` directory:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Start Development Server
```bash
npm start
```

The app will open at http://localhost:3000

## Features

- ✅ Login/Signup with role selection
- ✅ Role-based dashboards (Student, Instructor, Admin, Analyst)
- ✅ Course browsing and enrollment
- ✅ User management (Admin)
- ✅ Instructor assignment (Admin)
- ✅ Responsive design

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LoginSignup.js
│   │   ├── StudentDashboard.js
│   │   ├── InstructorDashboard.js
│   │   ├── AdminDashboard.js
│   │   └── AnalystDashboard.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
└── package.json
```

## API Endpoints Used

- `POST /api/login` - User login
- `POST /api/signup` - User registration
- `GET /api/dashboard` - Get dashboard data
- `GET /api/courses` - Get all courses
- `POST /api/courses/enroll` - Enroll in course
- `GET /api/courses/my-courses` - Get user's courses
- `GET /api/admin/users` - Get all users (admin)
- `DELETE /api/admin/users/:id` - Delete user (admin)
- `POST /api/admin/assign` - Assign instructor (admin)

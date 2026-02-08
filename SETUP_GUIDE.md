# 🎓 Online Course Management Platform - Complete Setup Guide

## 📋 What is This Project?

This is a **Web-Based Information System** for an **Online Course Management Platform (MOOC)**. It's a complete web application that allows:

- **Students** to browse and enroll in courses
- **Instructors** to manage course content
- **Administrators** to manage users and assign instructors
- **Data Analysts** to view statistics and reports

## 🏗️ Project Architecture

```
┌─────────────────┐
│   Frontend      │  ← HTML Templates (Jinja2)
│   (Templates)   │  ← CSS Styling
│                 │  ← JavaScript (AJAX)
└────────┬────────┘
         │
┌────────▼────────┐
│   Backend       │  ← Flask (Python Web Framework)
│   (app.py)      │  ← Routes & Business Logic
└────────┬────────┘
         │
┌────────▼────────┐
│   Database      │  ← PostgreSQL
│   (db.py)       │  ← Connection Management
└─────────────────┘
```

## 📁 Project Structure

```
royal_dbms/
├── app.py              # Main Flask application (routes, logic)
├── db.py               # Database connection handler
├── requirements.txt    # Python dependencies
├── .env               # Database credentials (keep secret!)
├── schema.sql         # Database schema (tables, relationships)
├── SETUP_GUIDE.md     # This file
│
├── templates/         # HTML templates
│   ├── base.html
│   ├── login.html
│   ├── student_dashboard.html
│   ├── instructor_dashboard.html
│   ├── admin_dashboard.html
│   └── analyst_dashboard.html
│
└── static/           # CSS & JavaScript
    ├── styles.css
    └── app.js
```

## 🗄️ Database Schema Overview

Based on your ER diagram and code, the database has these main tables:

1. **users** - All system users (students, instructors, admins, analysts)
2. **student** - Student-specific information
3. **instructor** - Instructor-specific information
4. **course** - Course details
5. **enrolled_in** - Student enrollments (many-to-many)
6. **teaches** - Instructor-course assignments (many-to-many)

## 🚀 Step-by-Step Setup Instructions

### **STEP 1: Install PostgreSQL**

#### Option A: Local PostgreSQL Installation

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the Windows installer
   - Run the installer

2. **During Installation:**
   - Remember the password you set for the `postgres` user
   - Default port: `5432`
   - Keep default settings

3. **Verify Installation:**
   - Open Command Prompt
   - Run: `psql --version`

#### Option B: Use Cloud PostgreSQL (Current Setup)

You're currently using **Supabase** (cloud PostgreSQL). This is fine! You can continue using it or switch to local.

### **STEP 2: Create Database**

#### If Using Local PostgreSQL:

1. Open **pgAdmin** (comes with PostgreSQL) or use command line:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mooc_platform;

# Exit
\q
```

#### If Using Supabase (Current):

Your database is already created! Just make sure your `.env` file has correct credentials.

### **STEP 3: Set Up Python Environment**

1. **Install Python** (if not installed):
   - Download from: https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH"

2. **Navigate to project folder:**
```bash
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"
```

3. **Create virtual environment (recommended):**
```bash
python -m venv venv

# Activate it
venv\Scripts\activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### **STEP 4: Configure Database Connection**

1. **Update `.env` file:**

#### For Local PostgreSQL:
```env
DB_HOST=localhost
DB_NAME=mooc_platform
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

#### For Supabase (Current):
```env
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_NAME=postgres
DB_USER=postgres.mhycfzcixjcggzrzaipz
DB_PASSWORD=Nari@452270
DB_PORT=6543
```

**⚠️ IMPORTANT:** Never commit `.env` to Git! It contains sensitive credentials.

### **STEP 5: Create Database Tables**

1. **Run the schema file:**
   - Open `schema.sql` (we'll create this next)
   - Copy all SQL commands
   - Run them in your PostgreSQL database:

**Using pgAdmin:**
- Right-click on your database → Query Tool
- Paste SQL
- Execute (F5)

**Using Command Line:**
```bash
psql -U postgres -d mooc_platform -f schema.sql
```

**Using Supabase:**
- Go to SQL Editor in Supabase dashboard
- Paste and run the SQL

### **STEP 6: Insert Sample Data (Optional)**

Create some test users and courses so you can test the system:

```sql
-- Insert sample users
INSERT INTO users (user_id, name, email, role) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@mooc.com', 'administrator'),
('22222222-2222-2222-2222-222222222222', 'John Student', 'student@mooc.com', 'student'),
('33333333-3333-3333-3333-333333333333', 'Jane Instructor', 'instructor@mooc.com', 'instructor'),
('44444444-4444-4444-4444-444444444444', 'Data Analyst', 'analyst@mooc.com', 'data_analyst');

-- Insert into student table
INSERT INTO student (user_id) VALUES ('22222222-2222-2222-2222-222222222222');

-- Insert into instructor table
INSERT INTO instructor (user_id) VALUES ('33333333-3333-3333-3333-333333333333');

-- Insert sample courses
INSERT INTO course (course_id, title, duration, level) VALUES
('c001', 'Introduction to Python', '8 weeks', 'Beginner'),
('c002', 'Advanced Database Systems', '12 weeks', 'Advanced'),
('c003', 'Web Development Basics', '10 weeks', 'Intermediate');
```

### **STEP 7: Run the Application**

1. **Start Flask server:**
```bash
python app.py
```

2. **Open browser:**
   - Go to: http://localhost:5000
   - You should see the login page!

3. **Test Login:**
   - Use email: `student@mooc.com` (or any email from your sample data)
   - Password: (currently not checked, but you can add it later)

## 🎯 Understanding the Code Flow

### **1. User Login Flow:**
```
User enters email → app.py /login route → 
Query users table → Set session → Redirect to /dashboard
```

### **2. Dashboard Routing:**
```
/dashboard → Check user role → 
Route to appropriate dashboard (student/instructor/admin/analyst)
```

### **3. Student Features:**
- **Browse Courses:** `/courses` - Lists all available courses
- **Enroll:** `/enroll/<course_id>` - Adds enrollment record
- **My Courses:** `/mycourses` - Shows enrolled courses

### **4. Admin Features:**
- **Add Student:** `/admin/add_student` - Creates new student user
- **Delete Student:** `/admin/delete_student/<id>` - Removes student
- **Assign Instructor:** `/admin/assign` - Links instructor to course

## 🔧 Common Issues & Solutions

### **Issue 1: "Module not found"**
**Solution:** Make sure virtual environment is activated and dependencies installed:
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

### **Issue 2: "Connection refused"**
**Solution:** 
- Check PostgreSQL is running
- Verify `.env` credentials are correct
- Check firewall settings

### **Issue 3: "Table does not exist"**
**Solution:** Run `schema.sql` to create all tables

### **Issue 4: "SSL connection required"**
**Solution:** For Supabase, keep `sslmode="require"` in `db.py`. For local, change to `sslmode="disable"`

## 📝 Next Steps to Complete the Project

1. ✅ **Database Setup** - Create tables (schema.sql)
2. ✅ **Basic Routes** - Already done in app.py
3. ⬜ **Add Password Authentication** - Currently only email check
4. ⬜ **Add Course Content Management** - For instructors
5. ⬜ **Add Course Search** - For students
6. ⬜ **Add Statistics Dashboard** - For data analyst
7. ⬜ **Add Partner University** - If in ER diagram
8. ⬜ **Improve UI/UX** - Make it more polished

## 🎓 Assignment Deliverables Checklist

- [x] ER Diagram (you mentioned you have this)
- [ ] Table Schema (SQL file - we'll create this)
- [ ] Functionalities List (document what you've implemented)
- [ ] Front-end Tools List (HTML, CSS, JavaScript, Flask/Jinja2)

## 📚 Key Technologies Used

- **Backend:** Flask (Python web framework)
- **Database:** PostgreSQL
- **Frontend:** HTML5, CSS3, JavaScript
- **Templating:** Jinja2 (comes with Flask)
- **Database Driver:** psycopg2 (PostgreSQL adapter for Python)

## 🆘 Need Help?

1. Check Flask documentation: https://flask.palletsprojects.com/
2. Check PostgreSQL docs: https://www.postgresql.org/docs/
3. Review the code comments in `app.py`

---

**Ready to start?** Let's create the database schema file next!

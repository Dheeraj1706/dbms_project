# 🎓 Complete Guide: Online Course Management Platform

## 📖 What is This Project?

You're building a **Web-Based Information System** for an **Online Course Management Platform (MOOC)**. This is a complete web application that manages:

- **Students** - Browse and enroll in courses
- **Instructors** - Add course content and manage modules
- **Administrators** - Manage users, assign instructors to courses
- **Data Analysts** - View statistics and reports

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐
│         USER'S BROWSER                  │
│  (HTML/CSS/JavaScript Frontend)         │
└──────────────┬──────────────────────────┘
               │ HTTP Requests
               ▼
┌─────────────────────────────────────────┐
│         FLASK APPLICATION                │
│  (Python Backend - app.py)              │
│  - Routes (URLs)                         │
│  - Business Logic                        │
│  - Session Management                    │
└──────────────┬──────────────────────────┘
               │ SQL Queries
               ▼
┌─────────────────────────────────────────┐
│      POSTGRESQL DATABASE                 │
│  (Supabase Cloud Database)               │
│  - Tables (users, courses, etc.)         │
│  - Relationships                         │
│  - Row Level Security (RLS)             │
└─────────────────────────────────────────┘
```

## 📁 Project Structure Explained

```
royal_dbms/
│
├── app.py              # 🎯 MAIN APPLICATION FILE
│                        # Contains all routes (URLs) and logic
│                        # Example: /login, /dashboard, /courses
│
├── db.py               # 🔌 DATABASE CONNECTION
│                        # Handles connection to PostgreSQL
│                        # Uses credentials from .env file
│
├── schema.sql          # 🗄️ DATABASE STRUCTURE
│                        # All table definitions
│                        # Relationships, triggers, policies
│
├── requirements.txt    # 📦 PYTHON DEPENDENCIES
│                        # Lists all packages needed
│
├── .env               # 🔐 DATABASE CREDENTIALS
│                       # NEVER commit this to Git!
│                       # Contains: DB_HOST, DB_NAME, etc.
│
├── templates/         # 🎨 HTML TEMPLATES
│   ├── base.html      #   Base layout (sidebar, navigation)
│   ├── login.html     #   Login page
│   ├── student_dashboard.html
│   ├── instructor_dashboard.html
│   ├── admin_dashboard.html
│   └── analyst_dashboard.html
│
└── static/            # 💅 CSS & JAVASCRIPT
    ├── styles.css     #   All styling
    └── app.js         #   Frontend JavaScript (AJAX calls)
```

## 🗄️ Database Schema Overview

Your database has these main tables:

### **Core Tables:**

1. **`public.users`** - All system users
   - `user_id` (UUID, references `auth.users.id`)
   - `name`, `email`, `role`
   - Roles: `student`, `instructor`, `administrator`, `data_analyst`

2. **`public.student`** - Student details
   - `user_id` (FK to users)
   - `branch`, `country`, `dob`, `phone_number`
   - `total_courses_enrolled`, `total_courses_completed`

3. **`public.instructor`** - Instructor details
   - `user_id` (FK to users)
   - `branch`, `specialization`, `hire_year`, `phone_number`
   - `total_courses`

4. **`public.course`** - Course information
   - `course_id` (UUID)
   - `title`, `fees`, `duration`, `level`, `description`
   - `total_enrollments`, `total_vacancies`, `program`
   - `university_id` (FK to university)

5. **`public.university`** - Partner universities
   - `university_id` (UUID)
   - `name`, `country`, `ranking`, `website`

### **Relationship Tables:**

6. **`public.enrolled_in`** - Student enrollments
   - `user_id` + `course_id` (composite PK)
   - `enroll_date`, `status`, `grade`, `completion_date`

7. **`public.teaches`** - Instructor-course assignments
   - `instructor_id` + `course_id` (composite PK)

8. **`public.module`** - Course modules
   - `course_id` + `module_number` (composite PK)
   - `duration`, `name`

9. **`public.module_content`** - Content within modules
   - `content_id` (UUID)
   - `course_id`, `module_number`, `title`, `type`, `url`

## 🚀 Step-by-Step Setup Instructions

### **STEP 1: Verify Your Environment**

1. **Check Python is installed:**
   ```bash
   python --version
   ```
   Should show Python 3.7 or higher.

2. **Check PostgreSQL connection:**
   - Your `.env` file should have Supabase credentials
   - These are already configured ✅

### **STEP 2: Install Python Dependencies**

```bash
# Navigate to project folder
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"

# Install all required packages
pip install -r requirements.txt
```

This installs:
- `flask` - Web framework
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Loads .env file

### **STEP 3: Set Up Database Schema**

Your database schema is in `schema.sql`. Since you're using Supabase:

1. **Go to Supabase Dashboard:**
   - Open your project
   - Click "SQL Editor" in left sidebar

2. **Run the schema:**
   - Copy entire contents of `schema.sql`
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify tables were created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

### **STEP 4: Create Test Data (Optional)**

To test the application, create some sample users and courses:

```sql
-- First, create auth users via Supabase Auth dashboard
-- Then create profiles:

-- Example: If you created auth user with email 'student@test.com'
-- The trigger will auto-create the profile, but you can update it:
UPDATE public.users 
SET role = 'student' 
WHERE email = 'student@test.com';

-- Insert into student table
INSERT INTO public.student (user_id)
SELECT user_id FROM public.users WHERE email = 'student@test.com'
ON CONFLICT DO NOTHING;

-- Create sample courses
INSERT INTO public.course (course_id, title, duration, level, description)
VALUES 
    (gen_random_uuid(), 'Introduction to Python', '8 weeks', 'Beginner', 'Learn Python basics'),
    (gen_random_uuid(), 'Advanced Database Systems', '12 weeks', 'Advanced', 'Deep dive into DBMS'),
    (gen_random_uuid(), 'Web Development Basics', '10 weeks', 'Intermediate', 'HTML, CSS, JavaScript')
ON CONFLICT DO NOTHING;
```

### **STEP 5: Run the Application**

```bash
# Make sure you're in the project directory
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"

# Start Flask server
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### **STEP 6: Access the Website**

1. **Open browser:** http://localhost:5000
2. **Login page appears**
3. **Enter email** of a user from your database
4. **Click Login** (password not checked yet - you can add this later)

## 🔄 How the Application Works

### **1. User Login Flow:**

```
User enters email → 
Flask receives POST to /login → 
Query: SELECT * FROM public.users WHERE email = ? → 
If found: Store user_id, name, role in session → 
Redirect to /dashboard
```

### **2. Dashboard Routing:**

```
/dashboard → 
Check session for user_id → 
Get user role from session → 
Route to appropriate dashboard:
  - student → student_dashboard()
  - instructor → instructor_dashboard()
  - administrator → admin_dashboard()
  - data_analyst → analyst_dashboard()
```

### **3. Student Features:**

- **Browse Courses:** `/courses` - Returns JSON of all courses
- **Enroll:** `/enroll/<course_id>` - Inserts into `enrolled_in` table
- **My Courses:** `/mycourses` - Shows enrolled courses for logged-in student

### **4. Admin Features:**

- **View Users:** `/admin/users` - Lists all users
- **Add Student:** `/admin/add_student` - Creates student profile (requires auth user first)
- **Delete Student:** `/admin/delete_student/<user_id>` - Removes student
- **Assign Instructor:** `/admin/assign` - Links instructor to course

### **5. Instructor Features:**

- **View Courses:** Shows courses they teach (from `teaches` table)
- **Add Content:** Can add modules and module content (needs implementation)

## 🎯 Key Routes in app.py

| Route | Method | Purpose | Who Can Access |
|-------|--------|---------|----------------|
| `/` | GET | Login page | Everyone |
| `/login` | POST | Authenticate user | Everyone |
| `/dashboard` | GET | Role-based dashboard | Logged-in users |
| `/courses` | GET | List all courses | Students |
| `/enroll/<id>` | GET | Enroll in course | Students |
| `/mycourses` | GET | My enrolled courses | Students |
| `/admin/users` | GET | List all users | Admin |
| `/admin/add_student` | POST | Add new student | Admin |
| `/admin/delete_student/<id>` | GET | Delete student | Admin |
| `/admin/assign` | POST | Assign instructor | Admin |
| `/logout` | GET | Logout | Logged-in users |

## 🔐 Important Notes About Supabase

### **Authentication:**

Your schema uses Supabase Auth (`auth.users` table). This means:

1. **Users must be created via Supabase Auth API** or dashboard first
2. The trigger `handle_new_user()` automatically creates a profile in `public.users`
3. Flask app currently only checks email - you may want to add password verification

### **Row Level Security (RLS):**

Your database has RLS policies enabled. This means:
- Users can only see their own data (unless admin)
- Public can read courses and universities
- Admins can manage all users
- Instructors can add content to their courses

**Note:** When connecting via Flask with service role credentials, RLS may be bypassed. For production, use proper authentication.

## 🐛 Common Issues & Solutions

### **Issue 1: "ModuleNotFoundError: No module named 'flask'"**
**Solution:**
```bash
pip install -r requirements.txt
```

### **Issue 2: "Connection refused" or "could not connect to server"**
**Solution:**
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check internet connection (Supabase is cloud)

### **Issue 3: "relation 'users' does not exist"**
**Solution:**
- Run `schema.sql` in Supabase SQL Editor
- Make sure you're using `public.users` (with schema prefix)

### **Issue 4: "permission denied for table users"**
**Solution:**
- Check RLS policies allow your connection
- Verify database user has proper permissions
- For testing, you might need to temporarily disable RLS

### **Issue 5: "invalid input syntax for type uuid"**
**Solution:**
- Make sure course_id and user_id are UUIDs, not strings
- Use `::uuid` cast in SQL: `WHERE user_id = %s::uuid`

## 📝 Next Steps to Complete Your Project

### **Immediate Tasks:**

1. ✅ Database schema created
2. ✅ Basic routes implemented
3. ⬜ **Add password authentication** (currently only email check)
4. ⬜ **Implement course search** for students
5. ⬜ **Add course content management** for instructors
6. ⬜ **Create statistics dashboard** for data analyst
7. ⬜ **Add university management** (if needed)
8. ⬜ **Improve UI/UX** (make it prettier)

### **Assignment Deliverables:**

- [x] ER Diagram (you have this)
- [x] Table Schema (`schema.sql`)
- [ ] **Functionalities List** - Document what you've implemented
- [ ] **Front-end Tools List** - HTML, CSS, JavaScript, Flask/Jinja2

## 🎓 Understanding the Code

### **Example: How Login Works**

```python
@app.route("/login", methods=["POST"])
def login():
    email = request.form["email"]  # Get email from form
    
    conn = get_connection()  # Connect to database
    cur = conn.cursor()
    
    # Query database
    cur.execute("""
        SELECT user_id, name, role
        FROM public.users
        WHERE email = %s
    """, (email,))
    
    user = cur.fetchone()  # Get first result
    
    if not user:
        return "Invalid login"  # User not found
    
    # Store in session (like cookies)
    session["user_id"] = user[0]
    session["name"] = user[1]
    session["role"] = user[2]
    
    return redirect("/dashboard")  # Go to dashboard
```

### **Example: How Enrollment Works**

```python
@app.route("/enroll/<course_id>")
def enroll(course_id):
    user_id = session["user_id"]  # Get logged-in user
    
    conn = get_connection()
    cur = conn.cursor()
    
    # Insert enrollment record
    cur.execute("""
        INSERT INTO public.enrolled_in(user_id, course_id, status)
        VALUES (%s, %s::uuid, 'ongoing')
        ON CONFLICT DO NOTHING
    """, (user_id, course_id))
    
    conn.commit()  # Save changes
    return redirect("/dashboard")
```

## 📚 Technologies Used

- **Backend:** Flask (Python web framework)
- **Database:** PostgreSQL (via Supabase)
- **Frontend:** HTML5, CSS3, JavaScript
- **Templating:** Jinja2 (comes with Flask)
- **Database Driver:** psycopg2
- **Environment:** python-dotenv

## 🆘 Getting Help

1. **Flask Documentation:** https://flask.palletsprojects.com/
2. **PostgreSQL Docs:** https://www.postgresql.org/docs/
3. **Supabase Docs:** https://supabase.com/docs
4. **Check code comments** in `app.py` for explanations

---

## ✅ Quick Checklist

- [ ] Python installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Database schema created (`schema.sql` run in Supabase)
- [ ] `.env` file configured with correct credentials
- [ ] Flask app runs (`python app.py`)
- [ ] Can access http://localhost:5000
- [ ] Can login with test user
- [ ] Dashboard loads correctly

**You're all set! Start building your features! 🚀**

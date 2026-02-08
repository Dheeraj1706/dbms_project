# ⚡ Quick Start Guide

## 🎯 What You Need to Do Right Now

### **1. Install Dependencies (5 minutes)**
```bash
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"
pip install -r requirements.txt
```

### **2. Set Up Database (10 minutes)**

**Option A: Use Your Current Supabase Database**
- Your `.env` is already configured ✅
- Just run the schema.sql in Supabase SQL Editor

**Option B: Use Local PostgreSQL**
1. Install PostgreSQL from https://www.postgresql.org/download/windows/
2. Create database: `CREATE DATABASE mooc_platform;`
3. Update `.env`:
   ```env
   DB_HOST=localhost
   DB_NAME=mooc_platform
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_PORT=5432
   ```
4. Update `db.py` line 14: Change `sslmode="require"` to `sslmode="disable"`

### **3. Create Tables (2 minutes)**
- Copy contents of `schema.sql`
- Run in your PostgreSQL database (pgAdmin or Supabase SQL Editor)

### **4. Run the App (1 minute)**
```bash
python app.py
```
- Open: http://localhost:5000
- Login with: `student@mooc.com` (password not checked yet)

## 🎓 Understanding Your Project

### **What is This?**
A **web application** for managing online courses where:
- Students browse and enroll in courses
- Instructors add course content
- Admins manage users and assignments
- Analysts view statistics

### **How It Works:**
1. **User logs in** → Flask checks database → Sets session
2. **Dashboard loads** → Based on user role (student/instructor/admin/analyst)
3. **User performs actions** → Flask updates database → Shows results

### **Key Files:**
- `app.py` - All website routes and logic
- `db.py` - Database connection
- `schema.sql` - Database structure (tables)
- `templates/` - HTML pages
- `static/` - CSS and JavaScript

## 🚨 Common First-Time Issues

**"ModuleNotFoundError: No module named 'flask'"**
→ Run: `pip install -r requirements.txt`

**"Connection refused" or "could not connect"**
→ Check `.env` file has correct database credentials

**"relation 'users' does not exist"**
→ Run `schema.sql` to create tables

**"SSL connection required"**
→ For local PostgreSQL, change `sslmode="require"` to `sslmode="disable"` in `db.py`

## 📋 Next Steps After Setup

1. ✅ Database is set up
2. ✅ Website runs
3. ⬜ Add password authentication (currently only email)
4. ⬜ Add course content upload (for instructors)
5. ⬜ Add course search feature
6. ⬜ Add statistics dashboard (for analyst)
7. ⬜ Improve UI design

## 🆘 Need Detailed Help?

Read `SETUP_GUIDE.md` for complete step-by-step instructions!

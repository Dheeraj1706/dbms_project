# 🚀 React Frontend Setup Guide

## Overview

Your project now has a **React frontend** and **Flask REST API backend**. The frontend communicates with the backend via API calls.

## Architecture

```
┌─────────────────────┐
│   React Frontend    │  (Port 3000)
│   (Port 3000)       │
└──────────┬──────────┘
           │ HTTP Requests
           │ (CORS enabled)
           ▼
┌─────────────────────┐
│   Flask API         │  (Port 5000)
│   (Port 5000)       │
└──────────┬──────────┘
           │ SQL Queries
           ▼
┌─────────────────────┐
│   PostgreSQL        │
│   (Supabase)        │
└─────────────────────┘
```

## Step-by-Step Setup

### **STEP 1: Install Backend Dependencies**

```bash
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"
pip install -r requirements.txt
```

This installs:
- `flask` - Web framework
- `flask-cors` - Enable CORS for React
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Environment variables
- `requests` - For Supabase API calls

### **STEP 2: Configure Environment Variables**

Update your `.env` file with Supabase credentials:

```env
# Database (already configured)
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_NAME=postgres
DB_USER=postgres.mhycfzcixjcggzrzaipz
DB_PASSWORD=your_password
DB_PORT=6543

# Supabase Auth (for signup)
# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

**To get Supabase keys:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (keep secret!)

### **STEP 3: Start Flask Backend**

```bash
cd "c:\coding\DBMS project\royal_dbms\royal_dbms"
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

**Keep this terminal open!**

### **STEP 4: Install Node.js (if not installed)**

1. Download from: https://nodejs.org/
2. Install (includes npm)
3. Verify:
   ```bash
   node --version
   npm --version
   ```

### **STEP 5: Install React Dependencies**

Open a **new terminal** (keep Flask running):

```bash
cd "c:\coding\DBMS project\royal_dbms\royal_dbms\frontend"
npm install
```

This installs:
- React
- React Router
- Axios (for API calls)
- React Scripts (build tool)

### **STEP 6: Start React Frontend**

```bash
npm start
```

The browser should automatically open at **http://localhost:3000**

## 🎉 You're Done!

You should now see:
- **Login/Signup page** with tabs to switch between them
- **Sign up form** with role selection
- **Beautiful UI** with modern design

## Testing the Sign Up Feature

1. Click **"Sign Up"** tab
2. Fill in:
   - Name: Your name
   - Email: test@example.com
   - Password: (at least 6 characters)
   - Role: Select Student/Instructor/Admin/Analyst
3. Click **"Sign Up"**
4. You'll be automatically logged in and redirected to dashboard!

## Project Structure

```
royal_dbms/
├── app.py              # Flask REST API
├── db.py               # Database connection
├── requirements.txt    # Python dependencies
├── .env                # Environment variables
│
└── frontend/           # React application
    ├── package.json    # Node dependencies
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js      # Main app component
        ├── components/
        │   ├── LoginSignup.js
        │   ├── StudentDashboard.js
        │   ├── InstructorDashboard.js
        │   ├── AdminDashboard.js
        │   └── AnalystDashboard.js
        └── services/
            └── api.js  # API service functions
```

## API Endpoints

All endpoints are prefixed with `/api`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/login` | POST | User login |
| `/api/signup` | POST | User registration |
| `/api/dashboard` | GET | Get dashboard data |
| `/api/courses` | GET | List all courses |
| `/api/courses/enroll` | POST | Enroll in course |
| `/api/courses/my-courses` | GET | Get user's courses |
| `/api/admin/users` | GET | List all users |
| `/api/admin/users/:id` | DELETE | Delete user |
| `/api/admin/assign` | POST | Assign instructor |

## Troubleshooting

### **Issue: "Cannot connect to API"**
- Make sure Flask backend is running on port 5000
- Check `REACT_APP_API_URL` in frontend `.env` (or use default: http://localhost:5000/api)

### **Issue: "CORS error"**
- Flask CORS is enabled in `app.py` with `CORS(app)`
- Make sure backend is running

### **Issue: "Signup fails"**
- Check Supabase credentials in `.env`
- Verify `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` are correct
- Check Supabase project is active

### **Issue: "Module not found" in React**
```bash
cd frontend
npm install
```

### **Issue: "Port 3000 already in use"**
- Close other React apps
- Or change port: `PORT=3001 npm start`

## Development Workflow

1. **Start Flask backend** (Terminal 1):
   ```bash
   cd royal_dbms
   python app.py
   ```

2. **Start React frontend** (Terminal 2):
   ```bash
   cd royal_dbms/frontend
   npm start
   ```

3. **Make changes:**
   - React auto-reloads on save
   - Flask auto-reloads on save (debug mode)

## Building for Production

### Build React App:
```bash
cd frontend
npm run build
```

This creates an optimized build in `frontend/build/`

### Serve with Flask (optional):
You can serve the React build from Flask by adding:
```python
from flask import send_from_directory

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(f"frontend/build/{path}"):
        return send_from_directory('frontend/build', path)
    else:
        return send_from_directory('frontend/build', 'index.html')
```

## Next Steps

- ✅ React frontend set up
- ✅ Sign up functionality added
- ✅ Role-based dashboards
- ⬜ Add password validation
- ⬜ Add course content upload
- ⬜ Add search functionality
- ⬜ Improve error handling

---

**Happy Coding! 🎉**

from flask import Flask, request, jsonify
from flask_cors import CORS
from db import get_connection
import os
from dotenv import load_dotenv
import requests
import json

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me-in-production")
CORS(app)  # Enable CORS for React frontend

def require_admin(user_id):
    """Verify user has administrator role. Returns (ok, error_response)."""
    if not user_id:
        return False, (jsonify({"error": "user_id is required"}), 400)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT role FROM public.users WHERE user_id = %s::uuid", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row or row[0] != "administrator":
        return False, (jsonify({"error": "Unauthorized: admin access required"}), 403)
    return True, None

# Supabase Auth URL (get from your Supabase project settings)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


# =============================
# AUTHENTICATION
# =============================

@app.route("/api/login", methods=["POST"])
def login():
    """Login endpoint - verifies password via Supabase Auth, returns user data"""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Verify password via Supabase Auth
        if SUPABASE_URL and SUPABASE_ANON_KEY:
            auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
            payload = {"email": email, "password": password}
            auth_response = requests.post(auth_url, headers=headers, json=payload)
            if auth_response.status_code != 200:
                return jsonify({"error": "Invalid email or password"}), 401
            auth_data = auth_response.json()
            auth_user_id = auth_data.get("user", {}).get("id")
        else:
            return jsonify({"error": "Authentication not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY."}), 500

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT user_id, name, email, role, COALESCE(approved, false)
            FROM public.users
            WHERE user_id = %s
        """, (auth_user_id,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({"error": "User profile not found"}), 401

        # All users (except first admin) must be approved to login
        is_approved = user[4] if len(user) > 4 else True
        if not is_approved:
            return jsonify({"error": "Your account is pending admin approval. Please wait for approval."}), 403

        return jsonify({
            "success": True,
            "user": {
                "user_id": str(user[0]),
                "name": user[1],
                "email": user[2],
                "role": user[3]
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/signup", methods=["POST"])
def signup():
    """Sign up endpoint - creates new user via Supabase Auth"""
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "student")  # Default to student

        if not all([name, email, password]):
            return jsonify({"error": "Name, email, and password are required"}), 400

        # Create user in Supabase Auth
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "email": email,
                "password": password,
                "email_confirm": True,  # Auto-confirm email
                "user_metadata": {
                    "name": name
                }
            }

            response = requests.post(auth_url, headers=headers, json=payload)
            
            if response.status_code not in [200, 201]:
                error_msg = response.json().get("msg", "Failed to create user")
                # If email already registered in Auth but not in our DB (e.g. rejected signup), remove orphan and retry
                if "already" in error_msg.lower() and "registered" in error_msg.lower():
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("SELECT user_id FROM public.users WHERE email = %s", (email,))
                    row = cur.fetchone()
                    cur.close()
                    conn.close()
                    if not row:
                        # Email not in our DB -> orphan auth user; delete from Auth and retry once
                        list_url = f"{SUPABASE_URL}/auth/v1/admin/users?per_page=1000"
                        list_resp = requests.get(list_url, headers=headers)
                        if list_resp.status_code == 200:
                            data = list_resp.json()
                            users_list = data if isinstance(data, list) else (data.get("users") or []) if isinstance(data, dict) else []
                            for u in users_list:
                                    if isinstance(u, dict) and (u.get("email") or "").lower() == email.lower():
                                        orphan_id = u.get("id")
                                        if orphan_id:
                                            requests.delete(
                                                f"{SUPABASE_URL}/auth/v1/admin/users/{orphan_id}",
                                                headers=headers
                                            )
                                        response = requests.post(auth_url, headers=headers, json=payload)
                                        break
                if response.status_code not in [200, 201]:
                    error_msg = response.json().get("msg", "Failed to create user") if response.text else error_msg
                    return jsonify({"error": f"Signup failed: {error_msg}"}), 400

            auth_user = response.json()
            user_id = auth_user.get("id")

            # The trigger should auto-create the profile, but let's ensure it exists
            conn = get_connection()
            cur = conn.cursor()

            # Check if first admin - auto-approve
            cur.execute("SELECT COUNT(*) FROM public.users WHERE role = 'administrator' AND COALESCE(approved, false) = true")
            admin_count = cur.fetchone()[0]
            auto_approve = (role == "administrator" and admin_count == 0)

            cur.execute("""
                UPDATE public.users 
                SET name = %s, role = %s, approved = %s
                WHERE user_id = %s
            """, (name, role, auto_approve, user_id))

            if cur.rowcount == 0:
                cur.execute("""
                    INSERT INTO public.users (user_id, name, email, role, approved)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_id, name, email, role, auto_approve))

            # Create student/instructor record based on role
            if role == "student":
                cur.execute("""
                    INSERT INTO public.student (user_id)
                    VALUES (%s)
                    ON CONFLICT (user_id) DO NOTHING
                """, (user_id,))
            elif role == "instructor":
                cur.execute("""
                    INSERT INTO public.instructor (user_id)
                    VALUES (%s)
                    ON CONFLICT (user_id) DO NOTHING
                """, (user_id,))

            conn.commit()
            cur.close()
            conn.close()

            if auto_approve:
                return jsonify({
                    "success": True,
                    "message": "Admin account created.",
                    "user": {"user_id": str(user_id), "name": name, "email": email, "role": role}
                })
            return jsonify({
                "success": True,
                "message": "Account created. Please wait for admin approval before logging in.",
                "user": None
            })

        else:
            # Fallback: Create user directly in database (for testing without Supabase Auth)
            conn = get_connection()
            cur = conn.cursor()

            # Generate UUID (you'll need to import uuid)
            import uuid
            user_id = uuid.uuid4()

            cur.execute("""
                INSERT INTO public.users (user_id, name, email, role, approved)
                VALUES (%s, %s, %s, %s, false)
                RETURNING user_id
            """, (user_id, name, email, role))

            if role == "student":
                cur.execute("""
                    INSERT INTO public.student (user_id)
                    VALUES (%s)
                """, (user_id,))
            elif role == "instructor":
                cur.execute("""
                    INSERT INTO public.instructor (user_id)
                    VALUES (%s)
                """, (user_id,))

            conn.commit()
            cur.close()
            conn.close()

            return jsonify({
                "success": True,
                "message": "Account created. Please wait for admin approval before logging in.",
                "user": None
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# DASHBOARD DATA
# =============================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    """Get dashboard data based on user role"""
    try:
        user_id = request.args.get("user_id")
        role = request.args.get("role")

        if not user_id or not role:
            return jsonify({"error": "user_id and role are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        if role == "student":
            # Compute counts dynamically from enrolled_in
            cur.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE status != 'dropped') as enrolled,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed
                FROM public.enrolled_in
                WHERE user_id = %s
            """, (user_id,))
            data = cur.fetchone()
            result = {
                "enrolled_count": data[0] if data else 0,
                "completed_count": data[1] if data else 0
            }

        elif role == "instructor":
            # Compute total courses dynamically from teaches
            cur.execute("""
                SELECT COUNT(*) FROM public.teaches
                WHERE instructor_id = %s
            """, (user_id,))
            data = cur.fetchone()
            result = {
                "total_courses": data[0] if data else 0
            }

        elif role == "administrator":
            cur.execute("SELECT COUNT(*) FROM public.users")
            total_users = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM public.course")
            total_courses = cur.fetchone()[0]
            result = {
                "total_users": total_users,
                "total_courses": total_courses
            }

        elif role == "data_analyst":
            cur.execute("SELECT COUNT(*) FROM public.enrolled_in")
            total_enrollments = cur.fetchone()[0]
            result = {
                "total_enrollments": total_enrollments
            }

        else:
            return jsonify({"error": "Invalid role"}), 400

        cur.close()
        conn.close()

        return jsonify({"success": True, "data": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# COURSES
# =============================

@app.route("/api/courses", methods=["GET"])
def courses():
    """Get all courses with university and instructor(s)"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT c.course_id, c.title, c.duration, c.level, c.description, c.fees,
                   un.name AS university_name, un.ranking AS university_ranking,
                   (SELECT string_agg('Prof. ' || u.name, ', ')
                    FROM public.teaches t
                    JOIN public.users u ON t.instructor_id = u.user_id
                    WHERE t.course_id = c.course_id) AS instructor_names
            FROM public.course c
            LEFT JOIN public.university un ON c.university_id = un.university_id
            ORDER BY c.title
        """)

        courses = cur.fetchall()
        cur.close()
        conn.close()

        courses_list = []
        for course in courses:
            courses_list.append({
                "course_id": str(course[0]),
                "title": course[1],
                "duration": course[2],
                "level": course[3],
                "description": course[4],
                "fees": float(course[5]) if course[5] else None,
                "university_name": course[6] or None,
                "university_ranking": course[7] if course[7] is not None else None,
                "instructor_names": course[8] or None
            })

        return jsonify({"success": True, "courses": courses_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/courses/enroll", methods=["POST"])
def enroll():
    """Enroll in a course"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        course_id = data.get("course_id")

        if not user_id or not course_id:
            return jsonify({"error": "user_id and course_id are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO public.enrolled_in(user_id, course_id, status)
            VALUES (%s, %s::uuid, 'ongoing')
            ON CONFLICT (user_id, course_id) DO NOTHING
            RETURNING enroll_date
        """, (user_id, course_id))

        if cur.rowcount == 0:
            return jsonify({"error": "Already enrolled or invalid course"}), 400

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Enrolled successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/courses/my-courses", methods=["GET"])
def my_courses():
    """Get enrolled courses for a user"""
    try:
        user_id = request.args.get("user_id")
        status = request.args.get("status")  # Optional filter: 'ongoing', 'completed', 'dropped'
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        if status:
            cur.execute("""
                SELECT c.course_id, c.title, c.duration, c.level, e.status,
                       e.enroll_date, e.grade, e.completion_date,
                       un.name AS university_name, un.ranking AS university_ranking,
                       (SELECT string_agg('Prof. ' || u.name, ', ')
                        FROM public.teaches t
                        JOIN public.users u ON t.instructor_id = u.user_id
                        WHERE t.course_id = c.course_id) AS instructor_names
                FROM public.enrolled_in e
                JOIN public.course c ON c.course_id = e.course_id
                LEFT JOIN public.university un ON c.university_id = un.university_id
                WHERE e.user_id = %s AND e.status = %s
                ORDER BY e.enroll_date DESC
            """, (user_id, status))
        else:
            cur.execute("""
                SELECT c.course_id, c.title, c.duration, c.level, e.status,
                       e.enroll_date, e.grade, e.completion_date,
                       un.name AS university_name, un.ranking AS university_ranking,
                       (SELECT string_agg('Prof. ' || u.name, ', ')
                        FROM public.teaches t
                        JOIN public.users u ON t.instructor_id = u.user_id
                        WHERE t.course_id = c.course_id) AS instructor_names
                FROM public.enrolled_in e
                JOIN public.course c ON c.course_id = e.course_id
                LEFT JOIN public.university un ON c.university_id = un.university_id
                WHERE e.user_id = %s
                ORDER BY e.enroll_date DESC
            """, (user_id,))

        courses = cur.fetchall()
        cur.close()
        conn.close()

        courses_list = []
        for course in courses:
            courses_list.append({
                "course_id": str(course[0]),
                "title": course[1],
                "duration": course[2],
                "level": course[3],
                "status": course[4],
                "enroll_date": str(course[5]) if course[5] else None,
                "grade": course[6],
                "completion_date": str(course[7]) if course[7] else None,
                "university_name": course[8] if len(course) > 8 else None,
                "university_ranking": course[9] if len(course) > 9 else None,
                "instructor_names": course[10] if len(course) > 10 else None
            })

        return jsonify({"success": True, "courses": courses_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/profile", methods=["GET"])
def get_student_profile():
    """Get student personal information"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT u.user_id, u.name, u.email, s.branch, s.country, s.dob, s.phone_number
            FROM public.users u
            JOIN public.student s ON s.user_id = u.user_id
            WHERE u.user_id = %s
        """, (user_id,))

        student = cur.fetchone()
        cur.close()
        conn.close()

        if not student:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({
            "success": True,
            "profile": {
                "user_id": str(student[0]),
                "name": student[1],
                "email": student[2],
                "branch": student[3],
                "country": student[4],
                "dob": str(student[5]) if student[5] else None,
                "phone_number": student[6]
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/profile", methods=["PUT"])
def update_student_profile():
    """Update student personal information (except email and password)"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        name = data.get("name")
        branch = data.get("branch")
        country = data.get("country")
        dob = data.get("dob")
        phone_number = data.get("phone_number")

        conn = get_connection()
        cur = conn.cursor()

        if name is not None:
            cur.execute("UPDATE public.users SET name = %s WHERE user_id = %s", (name, user_id))

        updates, params = [], []
        if branch is not None:
            updates.append("branch = %s")
            params.append(branch)
        if country is not None:
            updates.append("country = %s")
            params.append(country)
        if dob is not None:
            updates.append("dob = %s")
            params.append(dob)
        if phone_number is not None:
            updates.append("phone_number = %s")
            params.append(phone_number)

        if not updates and name is None:
            cur.close()
            conn.close()
            return jsonify({"error": "No fields to update"}), 400

        if updates:
            params.append(user_id)
            cur.execute(f"UPDATE public.student SET {', '.join(updates)} WHERE user_id = %s", params)

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Profile updated successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# ADMIN ROUTES
# =============================

@app.route("/api/admin/users", methods=["GET"])
def get_users():
    """Get all users (admin only)"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT user_id, name, email, role, COALESCE(approved, true)
            FROM public.users
            ORDER BY created_at DESC
        """)

        users = cur.fetchall()
        cur.close()
        conn.close()

        users_list = []
        for user in users:
            users_list.append({
                "user_id": str(user[0]),
                "name": user[1],
                "email": user[2],
                "role": user[3],
                "approved": user[4]
            })

        return jsonify({"success": True, "users": users_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/approve", methods=["POST"])
def approve_user():
    """Approve a user (admin only)"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE public.users SET approved = true WHERE user_id = %s::uuid
        """, (user_id,))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "User approved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
def delete_student(user_id):
    """Delete a user (admin only). Removes from DB and from Supabase Auth so the email can sign up again."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Remove from role tables first (user may be student or instructor)
        cur.execute("DELETE FROM public.student WHERE user_id = %s::uuid", (user_id,))
        cur.execute("DELETE FROM public.instructor WHERE user_id = %s::uuid", (user_id,))
        cur.execute("DELETE FROM public.users WHERE user_id = %s::uuid", (user_id,))

        conn.commit()
        cur.close()
        conn.close()

        # Delete from Supabase Auth so the same email can sign up again
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            auth_delete_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            }
            auth_response = requests.delete(auth_delete_url, headers=headers)
            # 200 or 404 (already gone) are both OK
            if auth_response.status_code not in (200, 204, 404):
                # Log but don't fail - DB user is already removed
                pass

        return jsonify({"success": True, "message": "User deleted"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/assign", methods=["POST"])
def assign_instructor():
    """Assign instructor to course (admin only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")

        if not instructor_id or not course_id:
            return jsonify({"error": "instructor_id and course_id are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO public.teaches(instructor_id, course_id)
            VALUES (%s::uuid, %s::uuid)
            ON CONFLICT DO NOTHING
        """, (instructor_id, course_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Instructor assigned"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/courses", methods=["GET"])
def admin_courses():
    """Get all courses (admin view)"""
    return courses()  # Reuse the courses endpoint


@app.route("/api/admin/courses", methods=["POST"])
def create_course():
    """Create a new course (admin only). Requires university_name and university_ranking; creates university if needed."""
    try:
        data = request.get_json()
        admin_user_id = data.get("admin_user_id")
        ok, err = require_admin(admin_user_id)
        if not ok:
            return err

        title = data.get("title")
        duration = data.get("duration", "")
        level = data.get("level", "beginner")
        description = data.get("description", "")
        fees = data.get("fees")
        university_name = (data.get("university_name") or "").strip()
        university_ranking = data.get("university_ranking")

        if not title or not title.strip():
            return jsonify({"error": "title is required"}), 400
        if not university_name:
            return jsonify({"error": "university name is required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        # Get or create university
        cur.execute("SELECT university_id, ranking FROM public.university WHERE name = %s", (university_name,))
        un_row = cur.fetchone()
        if un_row:
            university_id = un_row[0]
            if university_ranking is not None:
                cur.execute("UPDATE public.university SET ranking = %s WHERE university_id = %s", (university_ranking, university_id))
        else:
            cur.execute("""
                INSERT INTO public.university (name, ranking)
                VALUES (%s, %s)
                RETURNING university_id
            """, (university_name, university_ranking if university_ranking is not None else None))
            university_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO public.course (title, duration, level, description, fees, university_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING course_id, title, duration, level, description, fees
        """, (title.strip(), duration or "", level or "beginner", description or "", fees, university_id))

        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Course created successfully",
            "course": {
                "course_id": str(row[0]),
                "title": row[1],
                "duration": row[2],
                "level": row[3],
                "description": row[4],
                "fees": float(row[5]) if row[5] else None
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/courses/<course_id>", methods=["DELETE"])
def delete_course(course_id):
    """Delete a course (admin only). Cascades to teaches, enrolled_in, modules, etc."""
    try:
        admin_user_id = request.args.get("admin_user_id")
        ok, err = require_admin(admin_user_id)
        if not ok:
            return err

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM public.course WHERE course_id = %s::uuid RETURNING course_id", (course_id,))
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "Course not found"}), 404
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": "Course deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/courses/<course_id>/instructors", methods=["GET"])
def get_course_instructors(course_id):
    """Get instructors assigned to a course (admin only)"""
    try:
        admin_user_id = request.args.get("admin_user_id")
        ok, err = require_admin(admin_user_id)
        if not ok:
            return err

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT u.user_id, u.name
            FROM public.teaches t
            JOIN public.users u ON t.instructor_id = u.user_id
            WHERE t.course_id = %s::uuid
            ORDER BY u.name
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        instructors = [{"user_id": str(r[0]), "name": r[1]} for r in rows]
        return jsonify({"success": True, "instructors": instructors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/courses/<course_id>/instructors/<instructor_id>", methods=["DELETE"])
def remove_course_instructor(course_id, instructor_id):
    """Remove an instructor from a course (admin only)"""
    try:
        admin_user_id = request.args.get("admin_user_id")
        ok, err = require_admin(admin_user_id)
        if not ok:
            return err

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM public.teaches
            WHERE course_id = %s::uuid AND instructor_id = %s::uuid
            RETURNING course_id
        """, (course_id, instructor_id))
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "Assignment not found"}), 404
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": "Instructor removed from course"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/courses/<course_id>", methods=["PUT"])
def update_course(course_id):
    """Update a course (admin only). Can update university name/ranking."""
    try:
        data = request.get_json()
        admin_user_id = data.get("admin_user_id")
        ok, err = require_admin(admin_user_id)
        if not ok:
            return err

        title = data.get("title")
        duration = data.get("duration")
        level = data.get("level")
        description = data.get("description")
        fees = data.get("fees")
        university_name = (data.get("university_name") or "").strip() if data.get("university_name") is not None else None
        university_ranking = data.get("university_ranking")

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT course_id, title, duration, level, description, fees, university_id FROM public.course WHERE course_id = %s::uuid", (course_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({"error": "Course not found"}), 404

        new_title = title.strip() if title is not None and title else row[1]
        new_duration = duration if duration is not None else row[2]
        new_level = level if level is not None else row[3]
        new_description = description if description is not None else row[4]
        new_fees = fees if fees is not None else row[5]
        current_university_id = row[6]

        if not new_title:
            cur.close()
            conn.close()
            return jsonify({"error": "title cannot be empty"}), 400

        # Update university if provided
        if university_name is not None:
            if university_name == "":
                new_university_id = None
            else:
                cur.execute("SELECT university_id FROM public.university WHERE name = %s", (university_name,))
                un_row = cur.fetchone()
                if un_row:
                    new_university_id = un_row[0]
                    if university_ranking is not None:
                        cur.execute("UPDATE public.university SET ranking = %s WHERE university_id = %s", (university_ranking, new_university_id))
                else:
                    cur.execute("""
                        INSERT INTO public.university (name, ranking)
                        VALUES (%s, %s)
                        RETURNING university_id
                    """, (university_name, university_ranking))
                    new_university_id = cur.fetchone()[0]
            cur.execute("UPDATE public.course SET title = %s, duration = %s, level = %s, description = %s, fees = %s, university_id = %s WHERE course_id = %s::uuid",
                        (new_title, new_duration or "", new_level or "beginner", new_description or "", new_fees, new_university_id, course_id))
        else:
            cur.execute("""
                UPDATE public.course
                SET title = %s, duration = %s, level = %s, description = %s, fees = %s
                WHERE course_id = %s::uuid
            """, (new_title, new_duration or "", new_level or "beginner", new_description or "", new_fees, course_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Course updated successfully",
            "course": {
                "course_id": course_id,
                "title": new_title,
                "duration": new_duration,
                "level": new_level,
                "description": new_description,
                "fees": float(new_fees) if new_fees else None
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/instructors", methods=["GET"])
def get_instructors():
    """Get all instructors with details (admin only)"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT u.user_id, u.name, u.email, i.branch, i.phone_number
            FROM public.users u
            JOIN public.instructor i ON i.user_id = u.user_id
            ORDER BY u.name
        """)

        instructors = cur.fetchall()
        cur.close()
        conn.close()

        instructors_list = []
        for instructor in instructors:
            instructors_list.append({
                "user_id": str(instructor[0]),
                "name": instructor[1],
                "email": instructor[2],
                "branch": instructor[3] or "N/A",
                "phone_number": instructor[4] or "N/A"
            })

        return jsonify({"success": True, "instructors": instructors_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# INSTRUCTOR ROUTES
# =============================

@app.route("/api/instructor/profile", methods=["GET"])
def get_instructor_profile():
    """Get instructor personal information"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT u.user_id, u.name, u.email, i.branch, i.specialization, i.hire_year, i.phone_number
            FROM public.users u
            JOIN public.instructor i ON i.user_id = u.user_id
            WHERE u.user_id = %s
        """, (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({"error": "Instructor not found"}), 404

        return jsonify({
            "success": True,
            "profile": {
                "user_id": str(row[0]),
                "name": row[1],
                "email": row[2],
                "branch": row[3],
                "specialization": row[4],
                "hire_year": row[5],
                "phone_number": row[6]
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/profile", methods=["PUT"])
def update_instructor_profile():
    """Update instructor personal information (except name, email, password)"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        branch = data.get("branch")
        specialization = data.get("specialization")
        hire_year = data.get("hire_year")
        phone_number = data.get("phone_number")

        conn = get_connection()
        cur = conn.cursor()
        updates, params = [], []
        if branch is not None:
            updates.append("branch = %s")
            params.append(branch)
        if specialization is not None:
            updates.append("specialization = %s")
            params.append(specialization)
        if hire_year is not None:
            updates.append("hire_year = %s")
            params.append(int(hire_year) if hire_year else None)
        if phone_number is not None:
            updates.append("phone_number = %s")
            params.append(phone_number)

        if not updates:
            cur.close()
            conn.close()
            return jsonify({"error": "No fields to update"}), 400

        params.append(user_id)
        cur.execute(f"UPDATE public.instructor SET {', '.join(updates)} WHERE user_id = %s", params)
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Profile updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/courses", methods=["GET"])
def get_instructor_courses():
    """Get all courses taught by an instructor"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT c.course_id, c.title, c.duration, c.level, c.description,
                   COUNT(e.user_id) as enrolled_count
            FROM public.teaches t
            JOIN public.course c ON c.course_id = t.course_id
            LEFT JOIN public.enrolled_in e ON e.course_id = c.course_id AND e.status != 'dropped'
            WHERE t.instructor_id = %s
            GROUP BY c.course_id, c.title, c.duration, c.level, c.description
            ORDER BY c.title
        """, (instructor_id,))

        courses = cur.fetchall()
        cur.close()
        conn.close()

        courses_list = []
        for course in courses:
            courses_list.append({
                "course_id": str(course[0]),
                "title": course[1],
                "duration": course[2],
                "level": course[3],
                "description": course[4],
                "enrolled_count": course[5]
            })

        return jsonify({"success": True, "courses": courses_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/courses/<course_id>/students", methods=["GET"])
def get_course_students(course_id):
    """Get all students enrolled in a course (instructor only)"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        # Verify instructor teaches this course
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            SELECT u.user_id, u.name, u.email, e.status, e.grade, 
                   e.enroll_date, e.completion_date
            FROM public.enrolled_in e
            JOIN public.users u ON u.user_id = e.user_id
            WHERE e.course_id = %s AND e.status != 'dropped'
            ORDER BY u.name
        """, (course_id,))

        students = cur.fetchall()

        students_list = []
        for student in students:
            cur.execute("""
                SELECT COALESCE(SUM(s.marks_obtained), 0), COALESCE(SUM(a.max_marks), 0)
                FROM public.assignment_submission s
                JOIN public.assignment a ON a.assignment_id = s.assignment_id
                WHERE s.student_id = %s AND a.course_id = %s
            """, (student[0], course_id))
            tot = cur.fetchone()
            obtained = tot[0] or 0
            possible = tot[1] or 0
            percent = round(obtained / possible * 100, 1) if possible > 0 else 0
            students_list.append({
                "user_id": str(student[0]),
                "name": student[1],
                "email": student[2],
                "status": student[3],
                "grade": student[4],
                "enroll_date": str(student[5]) if student[5] else None,
                "completion_date": str(student[6]) if student[6] else None,
                "assignment_total_obtained": obtained,
                "assignment_total_possible": possible,
                "assignment_percent": percent
            })

        cur.close()
        conn.close()

        return jsonify({"success": True, "students": students_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/grade", methods=["POST"])
def grade_student():
    """Grade a student (instructor only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        student_id = data.get("student_id")
        grade = data.get("grade")
        status = data.get("status", "completed")  # Default to completed when grading

        if not all([instructor_id, course_id, student_id, grade]):
            return jsonify({"error": "All fields are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify instructor teaches this course
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        # Update grade and status
        cur.execute("""
            UPDATE public.enrolled_in
            SET grade = %s, status = %s, completion_date = CURRENT_DATE
            WHERE user_id = %s AND course_id = %s
        """, (grade, status, student_id, course_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Student graded successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/remove-student", methods=["POST"])
def remove_student_from_course():
    """Remove a student from course (instructor only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        student_id = data.get("student_id")

        if not all([instructor_id, course_id, student_id]):
            return jsonify({"error": "All fields are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify instructor teaches this course
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        # Update status to dropped
        cur.execute("""
            UPDATE public.enrolled_in
            SET status = 'dropped'
            WHERE user_id = %s AND course_id = %s
        """, (student_id, course_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Student removed from course"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/courses/<course_id>/modules", methods=["GET"])
def get_course_modules(course_id):
    """Get all modules for a course"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify instructor teaches this course
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            SELECT module_number, name, duration
            FROM public.module
            WHERE course_id = %s
            ORDER BY module_number
        """, (course_id,))

        modules = cur.fetchall()
        cur.close()
        conn.close()

        modules_list = []
        for module in modules:
            modules_list.append({
                "module_number": module[0],
                "name": module[1],
                "duration": module[2]
            })

        return jsonify({"success": True, "modules": modules_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/courses/<course_id>/announcements", methods=["GET"])
def get_instructor_announcements(course_id):
    """Get all announcements for a course (instructor)"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            SELECT announcement_id, course_id, instructor_id, title, content, created_at
            FROM public.announcement
            WHERE course_id = %s
            ORDER BY created_at DESC
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        announcements = []
        for row in rows:
            announcements.append({
                "announcement_id": str(row[0]),
                "course_id": str(row[1]),
                "instructor_id": str(row[2]),
                "title": row[3],
                "content": row[4],
                "created_at": str(row[5]) if row[5] else None
            })
        return jsonify({"success": True, "announcements": announcements})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/announcement", methods=["POST"])
def create_announcement():
    """Create announcement for a course (instructor only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        title = data.get("title")
        content = data.get("content", "")

        if not all([instructor_id, course_id, title]):
            return jsonify({"error": "instructor_id, course_id, and title are required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            INSERT INTO public.announcement (course_id, instructor_id, title, content)
            VALUES (%s::uuid, %s::uuid, %s, %s)
            RETURNING announcement_id, title, content, created_at
        """, (course_id, instructor_id, title, content))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Announcement created successfully",
            "announcement": {
                "announcement_id": str(row[0]),
                "title": row[1],
                "content": row[2],
                "created_at": str(row[3]) if row[3] else None
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/module", methods=["POST"])
def create_module():
    """Create a new module for a course (instructor only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        module_number = data.get("module_number")
        name = data.get("name")
        duration = data.get("duration", "")

        if not all([instructor_id, course_id, module_number, name]):
            return jsonify({"error": "instructor_id, course_id, module_number, and name are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify instructor teaches this course
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        # Check if module number already exists
        cur.execute("""
            SELECT COUNT(*) FROM public.module
            WHERE course_id = %s AND module_number = %s
        """, (course_id, module_number))

        if cur.fetchone()[0] > 0:
            return jsonify({"error": "Module number already exists for this course"}), 400

        # Insert module
        cur.execute("""
            INSERT INTO public.module (course_id, module_number, name, duration)
            VALUES (%s, %s, %s, %s)
            RETURNING course_id, module_number
        """, (course_id, module_number, name, duration))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Module created successfully"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/module-content", methods=["POST"])
def add_module_content():
    """Add content to a module (instructor only)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        module_number = data.get("module_number")
        title = data.get("title")
        content_type = data.get("type")
        url = data.get("url")

        if not all([instructor_id, course_id, module_number, title, content_type, url]):
            return jsonify({"error": "All fields are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify instructor teaches this course
        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You don't teach this course"}), 403

        # Verify module exists
        cur.execute("""
            SELECT COUNT(*) FROM public.module
            WHERE course_id = %s AND module_number = %s
        """, (course_id, module_number))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "Module does not exist"}), 404

        # Insert content
        cur.execute("""
            INSERT INTO public.module_content (course_id, module_number, title, type, url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING content_id
        """, (course_id, module_number, title, content_type, url))

        content_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Content added successfully",
            "content_id": str(content_id)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# ASSIGNMENT ROUTES
# =============================

@app.route("/api/instructor/assignment", methods=["POST"])
def create_assignment():
    """Create assignment for a course (instructor only). Each assignment 20 marks, total 100."""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        course_id = data.get("course_id")
        module_number = data.get("module_number")  # Optional
        title = data.get("title")
        description = data.get("description", "")
        assignment_url = data.get("assignment_url")
        due_date = data.get("due_date")
        max_marks = data.get("max_marks", 20)

        if not all([instructor_id, course_id, title, assignment_url]):
            return jsonify({"error": "instructor_id, course_id, title, and assignment_url are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            INSERT INTO public.assignment 
            (course_id, module_number, instructor_id, title, description, assignment_url, due_date, max_marks)
            VALUES (%s::uuid, %s, %s::uuid, %s, %s, %s, %s::timestamp, %s)
            RETURNING assignment_id
        """, (course_id, module_number, instructor_id, title, description, assignment_url, due_date or None, max_marks))

        assignment_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Assignment created successfully",
            "assignment_id": str(assignment_id)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/courses/<course_id>/assignments", methods=["GET"])
def get_instructor_assignments(course_id):
    """Get assignments for a course (instructor)"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.teaches
            WHERE instructor_id = %s AND course_id = %s
        """, (instructor_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You don't teach this course"}), 403

        cur.execute("""
            SELECT assignment_id, course_id, module_number, title, description,
                   assignment_url, due_date, max_marks, created_at
            FROM public.assignment
            WHERE course_id = %s
            ORDER BY created_at DESC
        """, (course_id,))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        assignments = []
        for row in rows:
            assignments.append({
                "assignment_id": str(row[0]),
                "course_id": str(row[1]),
                "module_number": row[2],
                "title": row[3],
                "description": row[4],
                "assignment_url": row[5],
                "due_date": str(row[6]) if row[6] else None,
                "max_marks": row[7],
                "created_at": str(row[8]) if row[8] else None
            })

        return jsonify({"success": True, "assignments": assignments})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/courses/<course_id>/assignments", methods=["GET"])
def get_student_assignments(course_id):
    """Get assignments for a course (student - enrolled only)"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.enrolled_in
            WHERE user_id = %s AND course_id = %s AND status != 'dropped'
        """, (user_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You are not enrolled in this course"}), 403

        cur.execute("""
            SELECT a.assignment_id, a.course_id, a.module_number, a.title, a.description,
                   a.assignment_url, a.due_date, a.max_marks, a.created_at,
                   s.submission_id, s.submission_url, s.marks_obtained, s.feedback
            FROM public.assignment a
            LEFT JOIN public.assignment_submission s 
                ON s.assignment_id = a.assignment_id AND s.student_id = %s
            WHERE a.course_id = %s
            ORDER BY a.created_at DESC
        """, (user_id, course_id))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        assignments = []
        for row in rows:
            assignments.append({
                "assignment_id": str(row[0]),
                "course_id": str(row[1]),
                "module_number": row[2],
                "title": row[3],
                "description": row[4],
                "assignment_url": row[5],
                "due_date": str(row[6]) if row[6] else None,
                "max_marks": row[7],
                "created_at": str(row[8]) if row[8] else None,
                "submission_id": str(row[9]) if row[9] else None,
                "submission_url": row[10],
                "marks_obtained": row[11],
                "feedback": row[12]
            })

        return jsonify({"success": True, "assignments": assignments})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/assignment/submit", methods=["POST"])
def submit_assignment():
    """Submit assignment solution (student)"""
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        assignment_id = data.get("assignment_id")
        submission_url = data.get("submission_url")

        if not all([student_id, assignment_id, submission_url]):
            return jsonify({"error": "student_id, assignment_id, and submission_url are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT a.course_id FROM public.assignment a
            WHERE a.assignment_id = %s
        """, (assignment_id,))
        assign = cur.fetchone()
        if not assign:
            cur.close()
            conn.close()
            return jsonify({"error": "Assignment not found"}), 404

        cur.execute("""
            SELECT COUNT(*) FROM public.enrolled_in
            WHERE user_id = %s AND course_id = %s AND status != 'dropped'
        """, (student_id, assign[0]))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You are not enrolled in this course"}), 403

        cur.execute("""
            INSERT INTO public.assignment_submission (assignment_id, student_id, submission_url)
            VALUES (%s::uuid, %s::uuid, %s)
            ON CONFLICT (assignment_id, student_id) 
            DO UPDATE SET submission_url = EXCLUDED.submission_url, submitted_at = now()
            RETURNING submission_id
        """, (assignment_id, student_id, submission_url))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Submission successful"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/assignments/<assignment_id>/submissions", methods=["GET"])
def get_assignment_submissions(assignment_id):
    """Get all submissions for an assignment (instructor)"""
    try:
        instructor_id = request.args.get("instructor_id")
        if not instructor_id:
            return jsonify({"error": "instructor_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.assignment
            WHERE assignment_id = %s AND instructor_id = %s
        """, (assignment_id, instructor_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "Assignment not found or you don't own it"}), 403

        cur.execute("SELECT course_id FROM public.assignment WHERE assignment_id = %s", (assignment_id,))
        course_id_row = cur.fetchone()
        course_id = str(course_id_row[0]) if course_id_row else None

        cur.execute("""
            SELECT s.submission_id, s.student_id, u.name, u.email, s.submission_url,
                   s.submitted_at, s.marks_obtained, s.feedback, a.max_marks
            FROM public.assignment_submission s
            JOIN public.users u ON u.user_id = s.student_id
            JOIN public.assignment a ON a.assignment_id = s.assignment_id
            WHERE s.assignment_id = %s
            ORDER BY s.submitted_at DESC
        """, (assignment_id,))

        rows = cur.fetchall()

        submissions = []
        if course_id:
            student_ids = list(set(row[1] for row in rows))
            course_totals = {}
            for sid in student_ids:
                cur.execute("""
                    SELECT COALESCE(SUM(s2.marks_obtained), 0), COALESCE(SUM(a2.max_marks), 0)
                    FROM public.assignment_submission s2
                    JOIN public.assignment a2 ON a2.assignment_id = s2.assignment_id
                    WHERE s2.student_id = %s AND a2.course_id = %s
                """, (sid, course_id))
                tot = cur.fetchone()
                obtained = tot[0] or 0
                possible = tot[1] or 0
                percent = round(obtained / possible * 100, 1) if possible > 0 else 0
                course_totals[str(sid)] = {"obtained": obtained, "possible": possible, "percent": percent}

        cur.close()
        conn.close()

        for row in rows:
            sid = str(row[1])
            ct = course_totals.get(sid, {"obtained": 0, "possible": 0, "percent": 0})
            submissions.append({
                "submission_id": str(row[0]),
                "student_id": sid,
                "student_name": row[2],
                "student_email": row[3],
                "submission_url": row[4],
                "submitted_at": str(row[5]) if row[5] else None,
                "marks_obtained": row[6],
                "feedback": row[7],
                "max_marks": row[8],
                "course_total_obtained": ct["obtained"],
                "course_total_possible": ct["possible"],
                "course_percent": ct["percent"]
            })

        return jsonify({"success": True, "submissions": submissions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/instructor/submission/grade", methods=["POST"])
def grade_submission():
    """Grade an assignment submission (instructor)"""
    try:
        data = request.get_json()
        instructor_id = data.get("instructor_id")
        submission_id = data.get("submission_id")
        marks_obtained = data.get("marks_obtained")
        feedback = data.get("feedback", "")

        if not all([instructor_id, submission_id, marks_obtained is not None]):
            return jsonify({"error": "instructor_id, submission_id, and marks_obtained are required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) FROM public.assignment_submission s
            JOIN public.assignment a ON a.assignment_id = s.assignment_id
            WHERE s.submission_id = %s AND a.instructor_id = %s
        """, (submission_id, instructor_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "Submission not found or you cannot grade it"}), 403

        cur.execute("""
            SELECT max_marks FROM public.assignment a
            JOIN public.assignment_submission s ON s.assignment_id = a.assignment_id
            WHERE s.submission_id = %s
        """, (submission_id,))
        max_marks = cur.fetchone()[0]
        if marks_obtained < 0 or marks_obtained > max_marks:
            cur.close()
            conn.close()
            return jsonify({"error": f"Marks must be between 0 and {max_marks}"}), 400

        cur.execute("""
            UPDATE public.assignment_submission
            SET marks_obtained = %s, feedback = %s
            WHERE submission_id = %s
        """, (marks_obtained, feedback, submission_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Submission graded successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# STUDENT COURSE CONTENT ROUTES
# =============================

@app.route("/api/student/courses/<course_id>/modules", methods=["GET"])
def get_student_course_modules(course_id):
    """Get modules and content for a course (student only)"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()

        # Verify student is enrolled in this course
        cur.execute("""
            SELECT COUNT(*) FROM public.enrolled_in
            WHERE user_id = %s AND course_id = %s AND status != 'dropped'
        """, (user_id, course_id))

        if cur.fetchone()[0] == 0:
            return jsonify({"error": "You are not enrolled in this course"}), 403

        # Get modules with their content
        cur.execute("""
            SELECT m.module_number, m.name, m.duration,
                   mc.content_id, mc.title, mc.type, mc.url
            FROM public.module m
            LEFT JOIN public.module_content mc ON mc.course_id = m.course_id 
                AND mc.module_number = m.module_number
            WHERE m.course_id = %s
            ORDER BY m.module_number, mc.content_id
        """, (course_id,))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Organize modules and content
        modules_dict = {}
        for row in rows:
            module_num = row[0]
            if module_num not in modules_dict:
                modules_dict[module_num] = {
                    "module_number": module_num,
                    "name": row[1],
                    "duration": row[2],
                    "content": []
                }
            
            # Add content if exists
            if row[3]:  # content_id
                modules_dict[module_num]["content"].append({
                    "content_id": str(row[3]),
                    "title": row[4],
                    "type": row[5],
                    "url": row[6]
                })

        modules_list = list(modules_dict.values())

        return jsonify({"success": True, "modules": modules_list})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/courses/<course_id>/announcements", methods=["GET"])
def get_student_announcements(course_id):
    """Get announcements for a course (student - enrolled only)"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) FROM public.enrolled_in
            WHERE user_id = %s AND course_id = %s AND status != 'dropped'
        """, (user_id, course_id))
        if cur.fetchone()[0] == 0:
            cur.close()
            conn.close()
            return jsonify({"error": "You are not enrolled in this course"}), 403

        cur.execute("""
            SELECT announcement_id, title, content, created_at
            FROM public.announcement
            WHERE course_id = %s
            ORDER BY created_at DESC
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        announcements = []
        for row in rows:
            announcements.append({
                "announcement_id": str(row[0]),
                "title": row[1],
                "content": row[2],
                "created_at": str(row[3]) if row[3] else None
            })
        return jsonify({"success": True, "announcements": announcements})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# ANALYST ROUTES
# =============================

@app.route("/api/analyst/overview", methods=["GET"])
def analyst_overview():
    """Get platform overview stats for analyst"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM public.users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.course")
        total_courses = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.enrolled_in WHERE status != 'dropped'")
        total_enrollments = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.enrolled_in WHERE status = 'completed'")
        completed_enrollments = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.assignment")
        total_assignments = cur.fetchone()[0]

        completion_rate = round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments > 0 else 0

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "data": {
                "total_users": total_users,
                "total_courses": total_courses,
                "total_enrollments": total_enrollments,
                "completed_enrollments": completed_enrollments,
                "completion_rate": completion_rate,
                "total_assignments": total_assignments
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/courses", methods=["GET"])
def analyst_courses():
    """Get all courses with enrollment and completion stats"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT c.course_id, c.title, c.level, c.duration,
                   COUNT(e.user_id) FILTER (WHERE e.status != 'dropped') as enrolled,
                   COUNT(e.user_id) FILTER (WHERE e.status = 'completed') as completed,
                   (SELECT COUNT(*) FROM public.assignment WHERE course_id = c.course_id) as assignment_count
            FROM public.course c
            LEFT JOIN public.enrolled_in e ON e.course_id = c.course_id
            GROUP BY c.course_id, c.title, c.level, c.duration
            ORDER BY enrolled DESC
        """)

        rows = cur.fetchall()
        cur.close()
        conn.close()

        courses = []
        for row in rows:
            enrolled = row[4] or 0
            completed = row[5] or 0
            rate = round(completed / enrolled * 100, 1) if enrolled > 0 else 0
            courses.append({
                "course_id": str(row[0]),
                "title": row[1],
                "level": row[2],
                "duration": row[3],
                "enrolled": enrolled,
                "completed": completed,
                "completion_rate": rate,
                "assignment_count": row[6] or 0
            })

        return jsonify({"success": True, "courses": courses})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/insights", methods=["GET"])
def analyst_insights():
    """Get analytical insights"""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT c.level, COUNT(*) as cnt
            FROM public.enrolled_in e
            JOIN public.course c ON c.course_id = e.course_id
            WHERE e.status != 'dropped'
            GROUP BY c.level
        """)
        enrollments_by_level = [{"level": row[0] or "Unknown", "count": row[1]} for row in cur.fetchall()]

        cur.execute("""
            SELECT u.role, COUNT(*) FROM public.users u GROUP BY u.role
        """)
        users_by_role = [{"role": row[0], "count": row[1]} for row in cur.fetchall()]

        cur.execute("""
            SELECT c.title, COUNT(e.user_id) as cnt
            FROM public.course c
            LEFT JOIN public.enrolled_in e ON e.course_id = c.course_id AND e.status != 'dropped'
            GROUP BY c.course_id, c.title
            ORDER BY cnt DESC
            LIMIT 5
        """)
        top_courses = [{"title": row[0], "enrollments": row[1]} for row in cur.fetchall()]

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "insights": {
                "enrollments_by_level": enrollments_by_level,
                "users_by_role": users_by_role,
                "top_courses_by_enrollment": top_courses
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/courses/<course_id>/grade-distribution", methods=["GET"])
def analyst_grade_distribution(course_id):
    """Get grade distribution for a course (for analyst to post as insight)"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT e.grade, COUNT(*) as cnt
            FROM public.enrolled_in e
            WHERE e.course_id = %s AND e.status = 'completed' AND e.grade IS NOT NULL AND e.grade != ''
            GROUP BY e.grade
            ORDER BY e.grade
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        data = [{"grade": row[0], "count": row[1]} for row in rows]
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/courses/<course_id>/stats", methods=["GET"])
def analyst_course_stats(course_id):
    """Get enrollment/completion stats for a course (for charts)"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE status != 'dropped') as enrolled,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'ongoing') as ongoing
            FROM public.enrolled_in WHERE course_id = %s
        """, (course_id,))
        row = cur.fetchone()
        cur.execute("""
            SELECT e.grade, COUNT(*) FROM public.enrolled_in e
            WHERE e.course_id = %s AND e.status = 'completed' AND e.grade IS NOT NULL AND e.grade != ''
            GROUP BY e.grade ORDER BY e.grade
        """, (course_id,))
        grade_rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({
            "success": True,
            "data": {
                "enrolled": row[0] or 0,
                "completed": row[1] or 0,
                "ongoing": row[2] or 0,
                "grade_distribution": [{"grade": r[0], "count": r[1]} for r in grade_rows]
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/insights/post", methods=["POST"])
def analyst_post_insight():
    """Analyst posts an insight to a course (students enrolled can then see it)"""
    try:
        data = request.get_json()
        posted_by = data.get("posted_by")
        course_id = data.get("course_id")
        title = data.get("title")
        chart_type = data.get("chart_type")
        chart_data = data.get("chart_data")
        summary = data.get("summary", "")

        if not all([posted_by, course_id, title, chart_type]):
            return jsonify({"error": "posted_by, course_id, title, chart_type required"}), 400

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT role FROM public.users WHERE user_id = %s::uuid", (posted_by,))
        row = cur.fetchone()
        if not row or row[0] != "data_analyst":
            cur.close()
            conn.close()
            return jsonify({"error": "Only analysts can post insights"}), 403

        chart_data_json = json.dumps(chart_data) if chart_data is not None else None
        cur.execute("""
            INSERT INTO public.course_insight (course_id, posted_by, title, chart_type, chart_data, summary)
            VALUES (%s::uuid, %s::uuid, %s, %s, %s::jsonb, %s)
            RETURNING insight_id, created_at
        """, (course_id, posted_by, title, chart_type, chart_data_json, summary))
        out = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            "success": True,
            "insight_id": str(out[0]),
            "created_at": str(out[1])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyst/insights/by-course", methods=["GET"])
def analyst_insights_by_course():
    """List insights posted for a course (analyst view)"""
    try:
        course_id = request.args.get("course_id")
        if not course_id:
            return jsonify({"error": "course_id required"}), 400
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT insight_id, course_id, posted_by, title, chart_type, chart_data, summary, created_at
            FROM public.course_insight WHERE course_id = %s ORDER BY created_at DESC
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        insights = []
        for r in rows:
            insights.append({
                "insight_id": str(r[0]),
                "course_id": str(r[1]),
                "posted_by": str(r[2]) if r[2] else None,
                "title": r[3],
                "chart_type": r[4],
                "chart_data": r[5],
                "summary": r[6],
                "created_at": str(r[7]) if r[7] else None
            })
        return jsonify({"success": True, "insights": insights})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/student/courses/<course_id>/insights", methods=["GET"])
def student_course_insights(course_id):
    """Get posted insights for a course (only for enrolled students)"""
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM public.enrolled_in
            WHERE user_id = %s AND course_id = %s AND status != 'dropped'
        """, (user_id, course_id))
        if cur.fetchone() is None:
            cur.close()
            conn.close()
            return jsonify({"error": "Not enrolled in this course"}), 403
        cur.execute("""
            SELECT insight_id, title, chart_type, chart_data, summary, created_at
            FROM public.course_insight WHERE course_id = %s ORDER BY created_at DESC
        """, (course_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        insights = []
        for r in rows:
            insights.append({
                "insight_id": str(r[0]),
                "title": r[1],
                "chart_type": r[2],
                "chart_data": r[3],
                "summary": r[4],
                "created_at": str(r[5]) if r[5] else None
            })
        return jsonify({"success": True, "insights": insights})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================
# HEALTH CHECK
# =============================

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "API is running"})

@app.route("/")
def home():
    return "backend is running successfully"

if __name__ == "__main__":
    app.run(debug=True, port=5000)

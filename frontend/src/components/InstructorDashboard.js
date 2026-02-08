import React, { useState, useEffect } from 'react';
import { dashboardAPI, instructorAPI } from '../services/api';
import ThemeToggle from './ThemeToggle';
import './Dashboard.css';

function InstructorDashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courseActionTab, setCourseActionTab] = useState('modules');
  const [gradingForm, setGradingForm] = useState({ student_id: '', grade: '', status: 'completed' });
  const [contentForm, setContentForm] = useState({ course_id: '', module_number: '', title: '', type: 'video', url: '' });
  const [moduleForm, setModuleForm] = useState({ course_id: '', module_number: '', name: '', duration: '' });
  const [assignmentForm, setAssignmentForm] = useState({ course_id: '', title: '', assignment_url: '', description: '', due_date: '', max_marks: 20 });
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  useEffect(() => {
    loadDashboardData();
    loadCourses();
    loadProfile();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await dashboardAPI.getDashboardData(user.user_id, user.role);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await instructorAPI.getCourses(user.user_id);
      if (response.success) {
        setCourses(response.courses);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await instructorAPI.getProfile(user.user_id);
      if (response.success) {
        setProfile(response.profile);
        setEditForm({
          branch: response.profile.branch || '',
          specialization: response.profile.specialization || '',
          hire_year: response.profile.hire_year || '',
          phone_number: response.profile.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await instructorAPI.updateProfile(user.user_id, editForm);
      if (response.success) {
        alert('Profile updated successfully');
        setIsEditingProfile(false);
        loadProfile();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const loadCourseStudents = async (courseId) => {
    try {
      const response = await instructorAPI.getCourseStudents(user.user_id, courseId);
      if (response.success) {
        setStudents(response.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      alert(error.response?.data?.error || 'Failed to load students');
    }
  };

  const loadCourseModules = async (courseId) => {
    try {
      const response = await instructorAPI.getCourseModules(user.user_id, courseId);
      if (response.success) {
        setModules(response.modules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadAnnouncements = async (courseId) => {
    try {
      const response = await instructorAPI.getAnnouncements(user.user_id, courseId);
      if (response.success) {
        setAnnouncements(response.announcements);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourse(courseId);
    loadCourseStudents(courseId);
    loadCourseModules(courseId);
    loadAnnouncements(courseId);
  };

  const handleGradeStudent = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    try {
      const response = await instructorAPI.gradeStudent(
        user.user_id,
        selectedCourse,
        gradingForm.student_id,
        gradingForm.grade,
        gradingForm.status
      );
      if (response.success) {
        alert('Student graded successfully!');
        setGradingForm({ student_id: '', grade: '', status: 'completed' });
        loadCourseStudents(selectedCourse);
        loadDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to grade student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this student from the course?')) {
      return;
    }

    try {
      const response = await instructorAPI.removeStudent(
        user.user_id,
        selectedCourse,
        studentId
      );
      if (response.success) {
        alert('Student removed from course');
        loadCourseStudents(selectedCourse);
        loadDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove student');
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    const courseId = selectedCourse || moduleForm.course_id;
    if (!courseId) return;
    try {
      const response = await instructorAPI.createModule(
        user.user_id,
        courseId,
        parseInt(moduleForm.module_number),
        moduleForm.name,
        moduleForm.duration
      );
      if (response.success) {
        alert('Module created successfully!');
        setModuleForm({ course_id: '', module_number: '', name: '', duration: '' });
        if (courseId) loadCourseModules(courseId);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create module');
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    const courseId = selectedCourse || contentForm.course_id;
    if (!courseId) return;
    try {
      const response = await instructorAPI.addModuleContent(
        user.user_id,
        courseId,
        contentForm.module_number,
        contentForm.title,
        contentForm.type,
        contentForm.url
      );
      if (response.success) {
        alert('Content added successfully!');
        setContentForm({ course_id: '', module_number: '', title: '', type: 'video', url: '' });
        if (courseId) loadCourseModules(courseId);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add content');
    }
  };

  const loadAssignments = async (courseId) => {
    try {
      const response = await instructorAPI.getCourseAssignments(user.user_id, courseId);
      if (response.success) setAssignments(response.assignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const response = await instructorAPI.getAssignmentSubmissions(user.user_id, assignmentId);
      if (response.success) setSubmissions(response.submissions);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load submissions');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const courseId = selectedCourse || assignmentForm.course_id;
    if (!courseId) return;
    try {
      const response = await instructorAPI.createAssignment(
        user.user_id,
        courseId,
        assignmentForm.title,
        assignmentForm.assignment_url,
        {
          description: assignmentForm.description,
          due_date: assignmentForm.due_date || null,
          max_marks: parseInt(assignmentForm.max_marks) || 20
        }
      );
      if (response.success) {
        alert('Assignment created successfully!');
        setAssignmentForm({ course_id: '', title: '', assignment_url: '', description: '', due_date: '', max_marks: 20 });
        if (courseId) loadAssignments(courseId);
        loadDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create assignment');
    }
  };

  const handleGradeSubmission = async (e, submissionId) => {
    e.preventDefault();
    const form = e.target;
    const marks = parseInt(form.marks?.value) ?? 0;
    const feedback = form.feedback?.value ?? '';
    try {
      const response = await instructorAPI.gradeSubmission(user.user_id, submissionId, marks, feedback);
      if (response.success) {
        alert('Submission graded successfully!');
        if (selectedAssignment) loadSubmissions(selectedAssignment);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to grade submission');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !announcementForm.title.trim()) return;
    try {
      const response = await instructorAPI.createAnnouncement(user.user_id, selectedCourse, announcementForm.title.trim(), announcementForm.content.trim());
      if (response.success) {
        alert('Announcement posted!');
        setAnnouncementForm({ title: '', content: '' });
        loadAnnouncements(selectedCourse);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create announcement');
    }
  };

  // const handleEmailAllStudents = () => {
  //   if (students.length === 0) {
  //     alert('No students enrolled in this course.');
  //     return;
  //   }
  //   const emails = students.map((s) => s.email).filter(Boolean);
  //   if (emails.length === 0) {
  //     alert('No student emails available.');
  //     return;
  //   }
  //   const bcc = emails.join(',');
  //   const courseTitle = courses.find((c) => c.course_id === selectedCourse)?.title || 'Course';
  //   const subject = encodeURIComponent(`CourseHub: ${courseTitle} - Announcement`);
  //   const mailtoUrl = `mailto:?bcc=${bcc}&subject=${subject}`;
  //   window.location.href = mailtoUrl;
  // };

  const handleEmailAllStudents = () => {
    if (!students.length) {
      alert('No students enrolled in this course.');
      return;
    }
  
    const emails = students.map(s => s.email).filter(Boolean);
    if (!emails.length) {
      alert('No student emails available.');
      return;
    }
  
    const bcc = encodeURIComponent(emails.join(','));
  
    const courseTitle =
      courses.find(c => c.course_id === selectedCourse)?.title || 'Course';
  
    const subject = encodeURIComponent(
      `CourseHub: ${courseTitle} - Announcement`
    );
  
    const gmailUrl = `https://mail.google.com/mail/?view=cm&bcc=${bcc}&su=${subject}`;
  
    window.open(gmailUrl, '_blank');
  };
  

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>🎓 CourseHub</h2>
        <a href="#dashboard" onClick={() => setActiveTab('dashboard')}>Dashboard</a>
        <a href="#profile" onClick={() => setActiveTab('profile')}>Personal Info</a>
        <a href="#courses" onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }}>My Courses</a>
        <a href="#logout" onClick={onLogout}>Logout</a>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <h1>Welcome, {user.name}!</h1>
          <ThemeToggle />
        </div>

        <div className="dashboard-content">
          {activeTab === 'profile' && (
            <div>
              <h2>Personal Information</h2>
              {profile && (
                <div className="card">
                  {!isEditingProfile ? (
                    <div>
                      <div className="profile-view">
                        <div className="profile-field"><label>Name:</label><span>{profile.name}</span></div>
                        <div className="profile-field"><label>Email:</label><span>{profile.email}</span></div>
                        <div className="profile-field"><label>Branch:</label><span>{profile.branch || 'Not set'}</span></div>
                        <div className="profile-field"><label>Specialization:</label><span>{profile.specialization || 'Not set'}</span></div>
                        <div className="profile-field"><label>Hire Year:</label><span>{profile.hire_year || 'Not set'}</span></div>
                        <div className="profile-field"><label>Phone Number:</label><span>{profile.phone_number || 'Not set'}</span></div>
                      </div>
                      <button className="btn btn-primary" onClick={() => setIsEditingProfile(true)} style={{ marginTop: '20px' }}>Edit Personal Info</button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile}>
                      <div className="form-group"><label>Name (Cannot be changed)</label><input type="text" className="input" value={profile.name} disabled /></div>
                      <div className="form-group"><label>Email (Cannot be changed)</label><input type="email" className="input" value={profile.email} disabled /></div>
                      <div className="form-group"><label>Branch</label><input type="text" className="input" value={editForm.branch} onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })} placeholder="e.g., CSE" /></div>
                      <div className="form-group"><label>Specialization</label><input type="text" className="input" value={editForm.specialization} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} placeholder="e.g., Machine Learning" /></div>
                      <div className="form-group"><label>Hire Year</label><input type="number" className="input" value={editForm.hire_year} onChange={(e) => setEditForm({ ...editForm, hire_year: e.target.value })} placeholder="e.g., 2020" /></div>
                      <div className="form-group"><label>Phone Number</label><input type="tel" className="input" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} placeholder="e.g., +1234567890" /></div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setIsEditingProfile(false); loadProfile(); }}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div>
              <h2>Instructor Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Courses</h3>
                  <div className="value">{dashboardData?.total_courses || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>Total Students</h3>
                  <div className="value">
                    {courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div>
              <h2>My Courses</h2>
              {courses.length === 0 ? (
                <p>You are not teaching any courses yet.</p>
              ) : !selectedCourse ? (
                <div className="courses-grid">
                  {courses.map((course) => (
                    <div key={course.course_id} className="course-card course-card-clickable" onClick={() => { handleSelectCourse(course.course_id); loadAssignments(course.course_id); setCourseActionTab('announcements'); }}>
                      <h3>{course.title}</h3>
                      <p className="course-level">{course.level}</p>
                      <p className="course-duration">Duration: {course.duration}</p>
                      <p className="course-description">
                        <strong>Students Enrolled:</strong> {course.enrolled_count || 0}
                      </p>
                      {course.description && (
                        <p className="course-description">{course.description}</p>
                      )}
                      <p className="course-action-hint">Click to manage modules, content & assignments</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="course-management-view">
                  <div className="course-header-bar">
                    <h3>{courses.find(c => c.course_id === selectedCourse)?.title}</h3>
                    <button className="btn btn-secondary" onClick={() => { setSelectedCourse(null); setStudents([]); setModules([]); setAssignments([]); setSelectedAssignment(null); setSubmissions([]); setAnnouncements([]); }}>← Back to Courses</button>
                  </div>
                  <div className="course-action-tabs">
                    <button className={courseActionTab === 'announcements' ? 'active' : ''} onClick={() => setCourseActionTab('announcements')}>Announcements</button>
                    <button className={courseActionTab === 'modules' ? 'active' : ''} onClick={() => setCourseActionTab('modules')}>Create Module</button>
                    <button className={courseActionTab === 'content' ? 'active' : ''} onClick={() => setCourseActionTab('content')}>Add Content</button>
                    <button className={courseActionTab === 'assignments' ? 'active' : ''} onClick={() => setCourseActionTab('assignments')}>Assignments</button>
                    <button className={courseActionTab === 'students' ? 'active' : ''} onClick={() => setCourseActionTab('students')}>Manage Students</button>
                  </div>
                  <div className="course-action-content">
                    {courseActionTab === 'announcements' && (
                      <div>
                        <div className="card">
                          <h3>Post Announcement</h3>
                          <form onSubmit={handleCreateAnnouncement}>
                            <div className="form-group">
                              <label>Title</label>
                              <input type="text" className="input" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="e.g., Assignment due date reminder" required />
                            </div>
                            <div className="form-group">
                              <label>Content</label>
                              <textarea className="input" rows="4" value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} placeholder="Write your announcement..." />
                            </div>
                            <button type="submit" className="btn btn-primary">Post Announcement</button>
                          </form>
                        </div>
                        <div className="card">
                          <h3>Recent Announcements</h3>
                          {announcements.length === 0 ? (
                            <p>No announcements yet. Post one above!</p>
                          ) : (
                            <div className="announcements-list">
                              {announcements.map((a) => (
                                <div key={a.announcement_id} className="announcement-item">
                                  <h4>{a.title}</h4>
                                  {a.content && <p>{a.content}</p>}
                                  <span className="announcement-date">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {courseActionTab === 'modules' && (
                      <div className="card">
                        <h3>Create Module</h3>
                        <form onSubmit={handleCreateModule}>
                          <input type="hidden" value={selectedCourse} onChange={() => {}} />
                          <div className="form-row">
                            <div className="form-group">
                              <label>Module Number</label>
                              <input type="number" className="input" value={moduleForm.module_number} onChange={(e) => setModuleForm({ ...moduleForm, course_id: selectedCourse, module_number: e.target.value })} placeholder="e.g., 1, 2, 3" min="1" required />
                            </div>
                            <div className="form-group">
                              <label>Module Name</label>
                              <input type="text" className="input" value={moduleForm.name} onChange={(e) => setModuleForm({ ...moduleForm, course_id: selectedCourse, name: e.target.value })} placeholder="e.g., Introduction" required />
                            </div>
                            <div className="form-group">
                              <label>Duration (Optional)</label>
                              <input type="text" className="input" value={moduleForm.duration} onChange={(e) => setModuleForm({ ...moduleForm, duration: e.target.value })} placeholder="e.g., 2 weeks" />
                            </div>
                          </div>
                          <button type="submit" className="btn btn-primary" onClick={() => setModuleForm(f => ({ ...f, course_id: selectedCourse }))}>Create Module</button>
                        </form>
                        {modules.length > 0 && (
                          <div className="existing-items" style={{ marginTop: '20px' }}>
                            <h4>Existing Modules</h4>
                            <ul>{modules.map((m) => <li key={m.module_number}>Module {m.module_number}: {m.name}{m.duration && ` (${m.duration})`}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                    {courseActionTab === 'content' && (
                      <div className="card">
                        <h3>Add Content to Module</h3>
                        <form onSubmit={handleAddContent}>
                          <div className="form-group">
                            <label>Select Module</label>
                            <select className="input" value={contentForm.module_number} onChange={(e) => setContentForm({ ...contentForm, course_id: selectedCourse, module_number: parseInt(e.target.value) })} required>
                              <option value="">Select a module</option>
                              {modules.map((m) => <option key={m.module_number} value={m.module_number}>Module {m.module_number}: {m.name}</option>)}
                            </select>
                          </div>
                          {modules.length === 0 && <p className="form-hint">Create modules first.</p>}
                          <div className="form-group">
                            <label>Content Title</label>
                            <input type="text" className="input" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} placeholder="e.g., Introduction video" required />
                          </div>
                          <div className="form-group">
                            <label>Content Type</label>
                            <select className="input" value={contentForm.type} onChange={(e) => setContentForm({ ...contentForm, type: e.target.value })}>
                              <option value="video">Video</option>
                              <option value="document">Document</option>
                              <option value="quiz">Quiz</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Content URL</label>
                            <input type="url" className="input" value={contentForm.url} onChange={(e) => setContentForm({ ...contentForm, url: e.target.value })} placeholder="https://..." required />
                          </div>
                          <button type="submit" className="btn btn-primary" onClick={() => setContentForm(f => ({ ...f, course_id: selectedCourse }))}>Add Content</button>
                        </form>
                      </div>
                    )}
                    {courseActionTab === 'assignments' && (
                      <div className="assignment-page">
                        <div className="card assignment-create-card">
                          <h3 className="assignment-section-title">Create Assignment</h3>
                          <form onSubmit={handleCreateAssignment} className="assignment-form">
                            <div className="form-row">
                              <div className="form-group">
                                <label>Title</label>
                                <input type="text" className="input" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, course_id: selectedCourse, title: e.target.value })} placeholder="e.g., Module 1 Assignment" required />
                              </div>
                              <div className="form-group">
                                <label>Assignment URL</label>
                                <input type="url" className="input" value={assignmentForm.assignment_url} onChange={(e) => setAssignmentForm({ ...assignmentForm, assignment_url: e.target.value })} placeholder="https://..." required />
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Description (Optional)</label>
                              <textarea className="input" value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} rows={2} />
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Due Date</label>
                                <input type="datetime-local" className="input" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} />
                              </div>
                              <div className="form-group">
                                <label>Max Marks</label>
                                <input type="number" className="input" min="1" max="100" value={assignmentForm.max_marks} onChange={(e) => setAssignmentForm({ ...assignmentForm, max_marks: e.target.value })} />
                              </div>
                            </div>
                            <div className="form-actions">
                              <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setAssignmentForm(f => ({ ...f, course_id: selectedCourse }))}>Create Assignment</button>
                            </div>
                          </form>
                        </div>
                        <div className="card assignment-list-card">
                          <h3 className="assignment-section-title">Course Assignments</h3>
                          {assignments.length === 0 ? <p className="assignment-empty">No assignments yet.</p> : (
                            <div className="assignment-list">
                              {assignments.map((a) => (
                                <div key={a.assignment_id} className="assignment-list-item">
                                  <div className="assignment-list-info">
                                    <strong>{a.title}</strong>
                                    <span className="assignment-meta">({a.max_marks} marks)</span>
                                    <a href={a.assignment_url} target="_blank" rel="noopener noreferrer" className="assignment-link">View assignment</a>
                                  </div>
                                  <button type="button" className="btn btn-primary btn-sm assignment-btn-submissions" onClick={() => { setSelectedAssignment(a.assignment_id); loadSubmissions(a.assignment_id); }}>Submissions</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {selectedAssignment && (
                            <div className="submissions-panel">
                              <div className="submissions-panel-header">
                                <span>Submissions</span>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedAssignment(null); setSubmissions([]); }}>Close</button>
                              </div>
                              {submissions.length > 0 ? (
                                <div className="table-wrap">
                                  <table className="table submissions-table">
                                    <thead><tr><th>Student</th><th>Course Total</th><th>Link</th><th>Marks</th><th>Grade</th></tr></thead>
                                    <tbody>
                                      {submissions.map((s) => (
                                        <tr key={s.submission_id}>
                                          <td>{s.student_name}</td>
                                          <td>{s.course_percent != null ? `${s.course_total_obtained}/${s.course_total_possible} (${s.course_percent}%)` : '-'}</td>
                                          <td><a href={s.submission_url} target="_blank" rel="noopener noreferrer" className="link-button">View</a></td>
                                          <td>{s.marks_obtained != null ? `${s.marks_obtained}/${s.max_marks}` : '-'}</td>
                                          <td>
                                            <form onSubmit={(e) => handleGradeSubmission(e, s.submission_id)} className="grade-form">
                                              <input name="marks" type="number" className="input grade-input" min="0" max={s.max_marks} placeholder="Marks" defaultValue={s.marks_obtained ?? ''} />
                                              <input name="feedback" type="text" className="input grade-feedback" placeholder="Feedback" defaultValue={s.feedback ?? ''} />
                                              <button type="submit" className="btn btn-primary btn-sm">Grade</button>
                                            </form>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : <p className="assignment-empty">No submissions yet.</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {courseActionTab === 'students' && (
                      <div>
                        <div className="card">
                          <div className="card-header-with-action">
                            <h3>Enrolled Students</h3>
                            <button type="button" className="btn btn-primary btn-sm btn-email-all" onClick={handleEmailAllStudents} disabled={students.length === 0} title="Opens your email client with all student emails in BCC">
                              📧 Email All Students
                            </button>
                          </div>
                          {students.length === 0 ? <p>No students enrolled.</p> : (
                            <table className="table">
                              <thead><tr><th>Name</th><th>Email</th><th>Assignment %</th><th>Status</th><th>Grade</th><th>Actions</th></tr></thead>
                              <tbody>
                                {students.map((s) => (
                                  <tr key={s.user_id}>
                                    <td>{s.name}</td>
                                    <td>{s.email}</td>
                                    <td>{s.assignment_percent != null ? `${s.assignment_total_obtained}/${s.assignment_total_possible} (${s.assignment_percent}%)` : '-'}</td>
                                    <td><span className={`status-badge status-${s.status}`}>{s.status}</span></td>
                                    <td>{s.grade || '-'}</td>
                                    <td><button className="btn btn-danger btn-sm" onClick={() => handleRemoveStudent(s.user_id)}>Remove</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                        <div className="card" style={{ marginTop: '20px' }}>
                          <h3>Grade Student</h3>
                          <form onSubmit={handleGradeStudent}>
                            <div className="form-group">
                              <label>Select Student</label>
                              <select className="input" value={gradingForm.student_id} onChange={(e) => setGradingForm({ ...gradingForm, student_id: e.target.value })} required>
                                <option value="">Select...</option>
                                {students.filter(s => s.status === 'ongoing' || s.status === 'completed').map((s) => (
                                  <option key={s.user_id} value={s.user_id}>{s.name} {s.assignment_percent != null ? `(${s.assignment_percent}%)` : ''}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Grade</label>
                                <input type="text" className="input" value={gradingForm.grade} onChange={(e) => setGradingForm({ ...gradingForm, grade: e.target.value })} placeholder="e.g., A, B+" required />
                              </div>
                              <div className="form-group">
                                <label>Status</label>
                                <select className="input" value={gradingForm.status} onChange={(e) => setGradingForm({ ...gradingForm, status: e.target.value })}>
                                  <option value="completed">Completed</option>
                                  <option value="ongoing">Ongoing</option>
                                </select>
                              </div>
                            </div>
                            <button type="submit" className="btn btn-primary">Submit Grade</button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default InstructorDashboard;

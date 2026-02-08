import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { dashboardAPI, coursesAPI, studentAPI, studentCourseAPI } from '../services/api';
import './Dashboard.css';

function StudentDashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [allEnrolledCourses, setAllEnrolledCourses] = useState([]);
  const [activeCourses, setActiveCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedActiveCourse, setSelectedActiveCourse] = useState(null);
  const [courseModules, setCourseModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submittingFor, setSubmittingFor] = useState(null);
  const [submitUrl, setSubmitUrl] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [courseInsights, setCourseInsights] = useState([]);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseLevelFilter, setBrowseLevelFilter] = useState('all');

  useEffect(() => {
    loadDashboardData();
    loadCourses();
    loadAllEnrolledCourses();
    loadActiveCourses();
    loadCompletedCourses();
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
      const response = await coursesAPI.getAll();
      if (response.success) {
        setCourses(response.courses);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAllEnrolledCourses = async () => {
    try {
      const response = await coursesAPI.getMyCourses(user.user_id);
      if (response.success) {
        setAllEnrolledCourses(response.courses);
      }
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
    }
  };

  const loadActiveCourses = async () => {
    try {
      const response = await coursesAPI.getMyCourses(user.user_id, 'ongoing');
      if (response.success) {
        setActiveCourses(response.courses);
      }
    } catch (error) {
      console.error('Error loading active courses:', error);
    }
  };

  const loadCompletedCourses = async () => {
    try {
      const response = await coursesAPI.getMyCourses(user.user_id, 'completed');
      if (response.success) {
        setCompletedCourses(response.courses);
      }
    } catch (error) {
      console.error('Error loading completed courses:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await studentAPI.getProfile(user.user_id);
      if (response.success) {
        setProfile(response.profile);
        setEditForm({
          name: response.profile.name || '',
          branch: response.profile.branch || '',
          country: response.profile.country || '',
          dob: response.profile.dob || '',
          phone_number: response.profile.phone_number || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const response = await coursesAPI.enroll(user.user_id, courseId);
      if (response.success) {
        alert('Enrolled successfully!');
        loadAllEnrolledCourses();
        loadActiveCourses();
        loadDashboardData();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to enroll');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      // Only send phone_number for update
      const response = await studentAPI.updateProfile(user.user_id, {
        name: editForm.name,
        branch: editForm.branch,
        country: editForm.country,
        dob: editForm.dob,
        phone_number: editForm.phone_number
      });
      if (response.success) {
        alert('Phone number updated successfully!');
        setIsEditingProfile(false);
        loadProfile();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const loadCourseContent = async (courseId) => {
    try {
      const response = await studentCourseAPI.getCourseModules(user.user_id, courseId);
      if (response.success) {
        setCourseModules(response.modules);
      }
    } catch (error) {
      console.error('Error loading course content:', error);
      alert(error.response?.data?.error || 'Failed to load course content');
    }
  };

  const loadAssignments = async (courseId) => {
    try {
      const response = await studentCourseAPI.getCourseAssignments(user.user_id, courseId);
      if (response.success) setAssignments(response.assignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      alert(error.response?.data?.error || 'Failed to load assignments');
    }
  };

  const loadAnnouncements = async (courseId) => {
    try {
      const response = await studentCourseAPI.getAnnouncements(user.user_id, courseId);
      if (response.success) setAnnouncements(response.announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    }
  };

  const loadCourseInsights = async (courseId) => {
    try {
      const response = await studentCourseAPI.getCourseInsights(user.user_id, courseId);
      if (response.success) setCourseInsights(response.insights);
      else setCourseInsights([]);
    } catch (error) {
      console.error('Error loading insights:', error);
      setCourseInsights([]);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submittingFor || !submitUrl.trim()) return;
    try {
      const response = await studentCourseAPI.submitAssignment(user.user_id, submittingFor, submitUrl.trim());
      if (response.success) {
        alert('Submission successful!');
        setSubmittingFor(null);
        setSubmitUrl('');
        if (selectedActiveCourse) loadAssignments(selectedActiveCourse);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit');
    }
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
        <a href="#enrolled" onClick={() => setActiveTab('enrolled')}>All Enrolled Courses</a>
        <a href="#active" onClick={() => { setActiveTab('active'); setSelectedActiveCourse(null); }}>Active Courses</a>
        <a href="#completed" onClick={() => setActiveTab('completed')}>Completed Courses</a>
        <a href="#browse" onClick={() => setActiveTab('browse')}>Browse Courses</a>
        <a href="#logout" onClick={onLogout}>Logout</a>
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <h1>Welcome, {user.name}!</h1>
          <ThemeToggle />
        </div>

        <div className="dashboard-content">
          {activeTab === 'dashboard' && (
            <div>
              <h2>Student Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Courses Enrolled</h3>
                  <div className="value">{dashboardData?.enrolled_count || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>Courses Completed</h3>
                  <div className="value">{dashboardData?.completed_count || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>Active Courses</h3>
                  <div className="value">{activeCourses.length}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2>Personal Information</h2>
              {profile && (
                <div className="card">
                  {!isEditingProfile ? (
                    <div>
                      <div className="profile-view">
                        <div className="profile-field">
                          <label>Name:</label>
                          <span>{profile.name}</span>
                        </div>
                        <div className="profile-field">
                          <label>Email:</label>
                          <span>{profile.email}</span>
                        </div>
                        <div className="profile-field">
                          <label>Branch:</label>
                          <span>{profile.branch || 'Not set'}</span>
                        </div>
                        <div className="profile-field">
                          <label>Country:</label>
                          <span>{profile.country || 'Not set'}</span>
                        </div>
                        <div className="profile-field">
                          <label>Date of Birth:</label>
                          <span>{profile.dob || 'Not set'}</span>
                        </div>
                        <div className="profile-field">
                          <label>Phone Number:</label>
                          <span>{profile.phone_number || 'Not set'}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => setIsEditingProfile(true)}
                        style={{ marginTop: '20px' }}
                      >
                        Edit Personal Info
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile}>
                      <div className="form-group">
                        <label>Name</label>
                        <input type="text" name="name" className="input" value={editForm.name || ''} onChange={handleEditChange} placeholder="Your name" required />
                      </div>
                      <div className="form-group">
                        <label>Email (Cannot be changed)</label>
                        <input type="email" className="input" value={profile.email} disabled />
                      </div>
                      <div className="form-group">
                        <label>Branch</label>
                        <input type="text" name="branch" className="input" value={editForm.branch || ''} onChange={handleEditChange} placeholder="e.g., Computer Science" />
                      </div>
                      <div className="form-group">
                        <label>Country</label>
                        <input type="text" name="country" className="input" value={editForm.country || ''} onChange={handleEditChange} placeholder="e.g., India" />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" name="dob" className="input" value={editForm.dob || ''} onChange={handleEditChange} />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" name="phone_number" className="input" value={editForm.phone_number} onChange={handleEditChange} placeholder="e.g., +1234567890" />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary">
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setIsEditingProfile(false);
                            loadProfile(); // Reset form
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrolled' && (
            <div>
              <h2>All Enrolled Courses</h2>
              {allEnrolledCourses.length === 0 ? (
                <p>You haven't enrolled in any courses yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>University</th>
                      <th>Instructor</th>
                      <th>Duration</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Enrolled Date</th>
                      {allEnrolledCourses.some(c => c.grade) && <th>Grade</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {allEnrolledCourses.map((course) => (
                      <tr key={course.course_id}>
                        <td>{course.title}</td>
                        <td>{course.university_name ? `${course.university_name}${course.university_ranking != null ? ` (Rank #${course.university_ranking})` : ''}` : '—'}</td>
                        <td>{course.instructor_names || '—'}</td>
                        <td>{course.duration}</td>
                        <td>{course.level}</td>
                        <td>
                          <span className={`status-badge status-${course.status}`}>
                            {course.status}
                          </span>
                        </td>
                        <td>{course.enroll_date}</td>
                        {allEnrolledCourses.some(c => c.grade) && (
                          <td>{course.grade || '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div>
              <h2>Active Courses</h2>
              {activeCourses.length === 0 ? (
                <p>You don't have any active courses.</p>
              ) : !selectedActiveCourse ? (
                <div className="courses-grid">
                  {activeCourses.map((course) => (
                    <div key={course.course_id} className="course-card course-card-clickable" onClick={() => { setSelectedActiveCourse(course.course_id); loadCourseContent(course.course_id); loadAssignments(course.course_id); loadAnnouncements(course.course_id); loadCourseInsights(course.course_id); }}>
                      <h3>{course.title}</h3>
                      {course.university_name && (
                        <p className="course-meta">Offered by: {course.university_name}{course.university_ranking != null ? ` (Rank #${course.university_ranking})` : ''}</p>
                      )}
                      {course.instructor_names && <p className="course-meta">Taught by: {course.instructor_names}</p>}
                      <p className="course-level">{course.level}</p>
                      <p className="course-duration">Duration: {course.duration}</p>
                      <p className="course-action-hint">Click to view content, assignments & marks</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="student-course-view">
                  <div className="student-course-header">
                    <div className="student-course-header-text">
                      <h3>{activeCourses.find(c => c.course_id === selectedActiveCourse)?.title}</h3>
                      {(() => {
                        const c = activeCourses.find(c => c.course_id === selectedActiveCourse);
                        return (c?.university_name || c?.instructor_names) ? (
                          <p className="course-meta course-meta-prominent">
                            {c?.university_name && <>Offered by: {c.university_name}{c?.university_ranking != null ? ` (Rank #${c.university_ranking})` : ''}</>}
                            {c?.university_name && c?.instructor_names && ' · '}
                            {c?.instructor_names && <>Taught by: {c.instructor_names}</>}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <button className="btn btn-secondary" onClick={() => { setSelectedActiveCourse(null); setCourseModules([]); setAssignments([]); setSubmittingFor(null); setSubmitUrl(''); setAnnouncements([]); setCourseInsights([]); }}>← Back to Courses</button>
                  </div>

                  <div className="student-course-section">
                    <h3>Announcements</h3>
                    {announcements.length === 0 ? (
                      <p style={{ color: '#666', margin: 0 }}>No announcements for this course yet.</p>
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

                  <div className="student-course-section student-insights-section">
                    <h3>Insights & Analysis</h3>
                    {courseInsights.length === 0 ? (
                      <p style={{ color: '#64748b', margin: 0 }}>No insights posted for this course yet. Analysts may add charts and analysis here.</p>
                    ) : (
                      <div className="insights-list">
                        {courseInsights.map((insight) => (
                          <div key={insight.insight_id} className="insight-card">
                            <h4 className="insight-title">{insight.title}</h4>
                            {insight.summary && <p className="insight-summary">{insight.summary}</p>}
                            {insight.chart_data && Array.isArray(insight.chart_data) && insight.chart_data.length > 0 && (
                              <div className="insight-chart">
                                <ResponsiveContainer width="100%" height={240}>
                                  {insight.chart_type === 'enrollment_status' || (insight.chart_type === 'pie' && insight.chart_data[0]?.name != null) ? (
                                    <PieChart>
                                      <Pie
                                        data={insight.chart_data}
                                        dataKey="count"
                                        nameKey={insight.chart_data[0]?.name != null ? 'name' : 'grade'}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={(e) => `${e.name || e.grade}: ${e.count}`}
                                      >
                                        {insight.chart_data.map((_, i) => (
                                          <Cell key={i} fill={['#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1'][i % 5]} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                      <Legend />
                                    </PieChart>
                                  ) : (
                                    <BarChart data={insight.chart_data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                      <XAxis dataKey={insight.chart_data[0]?.grade != null ? 'grade' : 'name'} stroke="#64748b" fontSize={12} />
                                      <YAxis stroke="#64748b" fontSize={12} />
                                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                                      <Bar dataKey="count" fill="#475569" radius={[4, 4, 0, 0]} name="Count" />
                                    </BarChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                            )}
                            {insight.created_at && <span className="insight-date">Posted {new Date(insight.created_at).toLocaleDateString()}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="student-course-section">
                    <h3>Course Content</h3>
                    {courseModules.length === 0 ? (
                      <p style={{ color: '#666', margin: 0 }}>No modules available for this course yet.</p>
                    ) : (
                      courseModules.map((module) => (
                        <div key={module.module_number} className="student-module-block">
                          <h4>Module {module.module_number}: {module.name}</h4>
                          {module.duration && <p style={{ color: '#666', fontSize: '13px', margin: '0 0 8px 0' }}>Duration: {module.duration}</p>}
                          {module.content.length === 0 ? (
                            <p style={{ color: '#999', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>No content in this module.</p>
                          ) : (
                            module.content.map((content) => (
                              <div key={content.content_id} className="student-content-item">
                                <span><strong>{content.title}</strong><span className="content-type-badge">{content.type}</span></span>
                                <a href={content.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">View</a>
                              </div>
                            ))
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="student-course-section student-assignments-section">
                    <h3>Assignments</h3>
                    {assignments.length === 0 ? (
                      <p className="assignment-empty-msg">No assignments for this course yet.</p>
                    ) : (
                      <>
                        <div className="student-assignment-list">
                          {assignments.map((a) => (
                            <div key={a.assignment_id} className="student-assignment-block">
                              <h4 className="student-assignment-title">{a.title}</h4>
                              {a.description && <p className="student-assignment-desc">{a.description}</p>}
                              <p className="student-assignment-meta"><strong>Max Marks:</strong> {a.max_marks}{a.due_date && <> · <strong>Due:</strong> {new Date(a.due_date).toLocaleString()}</>}</p>
                              <div className="student-assignment-actions">
                                <a href={a.assignment_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-assignment-view">View Assignment</a>
                                {submittingFor === a.assignment_id ? (
                                  <form onSubmit={handleSubmitAssignment} className="student-submit-form">
                                    <input type="url" className="input student-submit-input" value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="Paste your solution URL" required />
                                    <button type="submit" className="btn btn-primary btn-sm">Submit</button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSubmittingFor(null); setSubmitUrl(''); }}>Cancel</button>
                                  </form>
                                ) : (
                                  a.submission_url ? (
                                    <span className="student-submission-status">
                                      Submitted: <a href={a.submission_url} target="_blank" rel="noopener noreferrer">View</a>
                                      {a.marks_obtained != null && ` · Marks: ${a.marks_obtained}/${a.max_marks}`}
                                      {a.feedback && ` · Feedback: ${a.feedback}`}
                                    </span>
                                  ) : (
                                    <button type="button" className="btn btn-secondary btn-assignment-submit" onClick={() => setSubmittingFor(a.assignment_id)}>Submit Solution Link</button>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="student-total-marks">
                          Total Marks: {(() => {
                            const totalObtained = assignments.reduce((s, a) => s + (a.marks_obtained ?? 0), 0);
                            const totalPossible = assignments.reduce((s, a) => s + (a.max_marks || 0), 0);
                            const percent = totalPossible > 0 ? Math.round(totalObtained / totalPossible * 100) : 0;
                            return `${totalObtained}/${totalPossible} (${percent}%)`;
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              <h2>Completed Courses</h2>
              {completedCourses.length === 0 ? (
                <p>You haven't completed any courses yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>University</th>
                      <th>Instructor</th>
                      <th>Duration</th>
                      <th>Level</th>
                      <th>Completion Date</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedCourses.map((course) => (
                      <tr key={course.course_id}>
                        <td>{course.title}</td>
                        <td>{course.university_name ? `${course.university_name}${course.university_ranking != null ? ` (Rank #${course.university_ranking})` : ''}` : '—'}</td>
                        <td>{course.instructor_names || '—'}</td>
                        <td>{course.duration}</td>
                        <td>{course.level}</td>
                        <td>{course.completion_date || course.enroll_date}</td>
                        <td>
                          <span className="grade-badge">
                            {course.grade || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'browse' && (
            <div>
              <h2>Browse Courses</h2>
              <p className="browse-subtitle">Explore all available courses and enroll in the ones you're interested in.</p>
              <div className="browse-filters">
                <input
                  type="text"
                  className="input browse-search-input"
                  placeholder="Search by course name, university, or instructor..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                />
                <div className="browse-level-filters">
                  <span className="filter-label">Level:</span>
                  {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`btn btn-filter ${browseLevelFilter === level ? 'active' : ''}`}
                      onClick={() => setBrowseLevelFilter(level)}
                    >
                      {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="courses-grid browse-courses">
                {courses.length === 0 ? (
                  <p className="empty-state">No courses available. Check back later!</p>
                ) : (() => {
                  const filtered = courses.filter((course) => {
                    const levelOk = browseLevelFilter === 'all' || (course.level || '').toLowerCase() === browseLevelFilter;
                    const q = (browseSearch || '').toLowerCase().trim();
                    const searchOk = !q || [
                      course.title,
                      course.university_name,
                      course.instructor_names,
                      course.description
                    ].some((s) => (s || '').toLowerCase().includes(q));
                    return levelOk && searchOk;
                  });
                  return filtered.length === 0 ? (
                    <p className="empty-state">No courses match your search or filters. Try changing the level or search text.</p>
                  ) : (
                  filtered.map((course) => {
                    const isEnrolled = allEnrolledCourses.some(
                      (e) => e.course_id === course.course_id
                    );
                    return (
                      <div key={course.course_id} className="course-card course-card-browse">
                        <div className="course-card-header">
                          <h3>{course.title}</h3>
                          <span className="course-level">{course.level}</span>
                        </div>
                        {course.university_name && (
                          <p className="course-meta">Offered by: {course.university_name}{course.university_ranking != null ? ` (Rank #${course.university_ranking})` : ''}</p>
                        )}
                        {course.instructor_names && <p className="course-meta">Taught by: {course.instructor_names}</p>}
                        <p className="course-duration">Duration: {course.duration || '—'}</p>
                        <p className={`course-fees ${!course.fees ? 'free' : ''}`}>
                          {course.fees ? `₹${course.fees}` : 'Free'}
                        </p>
                        {course.description && (
                          <p className="course-description">{course.description}</p>
                        )}
                        {isEnrolled ? (
                          <span className="enrolled-badge">Already Enrolled</span>
                        ) : (
                          <button
                            className="btn btn-primary btn-enroll"
                            onClick={() => handleEnroll(course.course_id)}
                          >
                            Enroll Now
                          </button>
                        )}
                      </div>
                    );
                  }));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;

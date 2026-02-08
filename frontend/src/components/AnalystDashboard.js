import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { analystAPI } from '../services/api';
import './Dashboard.css';
import './AnalystDashboard.css';

const CHART_COLORS = ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

function AnalystDashboard({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseStats, setCourseStats] = useState(null);
  const [postInsightForm, setPostInsightForm] = useState({
    course_id: '',
    title: '',
    chart_type: 'grade_distribution',
    summary: '',
  });
  const [postedInsights, setPostedInsights] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, coursesRes, insightsRes] = await Promise.all([
        analystAPI.getOverview(),
        analystAPI.getCourses(),
        analystAPI.getInsights(),
      ]);
      if (overviewRes.success) setOverview(overviewRes.data);
      if (coursesRes.success) setCourses(coursesRes.courses);
      if (insightsRes.success) setInsights(insightsRes.insights);
    } catch (error) {
      console.error('Error loading analyst data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseStats = async (courseId) => {
    if (!courseId) return;
    try {
      const res = await analystAPI.getCourseStats(courseId);
      if (res.success) setCourseStats(res.data);
    } catch (e) {
      setCourseStats(null);
    }
  };

  const loadPostedInsights = async (courseId) => {
    if (!courseId) return;
    try {
      const res = await analystAPI.getInsightsByCourse(courseId);
      if (res.success) setPostedInsights(res.insights);
    } catch (e) {
      setPostedInsights([]);
    }
  };

  const handlePostInsight = async (e) => {
    e.preventDefault();
    if (!postInsightForm.course_id || !postInsightForm.title) {
      alert('Select a course and enter a title.');
      return;
    }
    let chart_data = null;
    if (postInsightForm.chart_type === 'grade_distribution' && courseStats?.grade_distribution?.length) {
      chart_data = courseStats.grade_distribution;
    } else if (postInsightForm.chart_type === 'enrollment_status' && courseStats) {
      chart_data = [
        { name: 'Enrolled', count: courseStats.enrolled, fill: '#475569' },
        { name: 'Completed', count: courseStats.completed, fill: '#64748b' },
        { name: 'Ongoing', count: courseStats.ongoing, fill: '#94a3b8' },
      ];
    }
    try {
      const res = await analystAPI.postInsight(
        user.user_id,
        postInsightForm.course_id,
        postInsightForm.title,
        postInsightForm.chart_type,
        chart_data,
        postInsightForm.summary
      );
      if (res.success) {
        alert('Insight posted! Students enrolled in this course can now see it.');
        setPostInsightForm({ course_id: '', title: '', chart_type: 'grade_distribution', summary: '' });
        setCourseStats(null);
        setSelectedCourseId('');
        if (postInsightForm.course_id) loadPostedInsights(postInsightForm.course_id);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post insight');
    }
  };

  if (loading) {
    return <div className="loading analyst-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container analyst-dashboard">
      <div className="sidebar analyst-sidebar">
        <h2>CourseHub</h2>
        <a href="#dashboard" onClick={() => setActiveTab('dashboard')}>Dashboard</a>
        <a href="#courses" onClick={() => setActiveTab('courses')}>All Courses</a>
        <a href="#insights" onClick={() => setActiveTab('insights')}>Insights</a>
        <a href="#post" onClick={() => setActiveTab('post')}>Post Insight</a>
        <a href="#logout" onClick={onLogout}>Logout</a>
      </div>

      <div className="main-content">
        <div className="dashboard-header analyst-header">
          <h1>Welcome, {user.name}!</h1>
          <ThemeToggle />
        </div>

        <div className="dashboard-content analyst-content">
          {activeTab === 'dashboard' && (
            <div>
              <h2>Analyst Dashboard</h2>
              <div className="stats-grid analyst-stats">
                <div className="stat-card analyst-stat">
                  <h3>Total Users</h3>
                  <div className="value">{overview?.total_users ?? 0}</div>
                </div>
                <div className="stat-card analyst-stat">
                  <h3>Total Courses</h3>
                  <div className="value">{overview?.total_courses ?? 0}</div>
                </div>
                <div className="stat-card analyst-stat">
                  <h3>Total Enrollments</h3>
                  <div className="value">{overview?.total_enrollments ?? 0}</div>
                </div>
                <div className="stat-card analyst-stat">
                  <h3>Completed</h3>
                  <div className="value">{overview?.completed_enrollments ?? 0}</div>
                </div>
                <div className="stat-card analyst-stat">
                  <h3>Completion Rate</h3>
                  <div className="value">{overview?.completion_rate ?? 0}%</div>
                </div>
                <div className="stat-card analyst-stat">
                  <h3>Total Assignments</h3>
                  <div className="value">{overview?.total_assignments ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div>
              <h2>All Courses – Analytics</h2>
              <div className="analyst-table-wrap">
                <table className="table analyst-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Level</th>
                      <th>Duration</th>
                      <th>Enrolled</th>
                      <th>Completed</th>
                      <th>Completion Rate</th>
                      <th>Assignments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr key={c.course_id}>
                        <td>{c.title}</td>
                        <td><span className="course-level analyst-level">{c.level}</span></td>
                        <td>{c.duration}</td>
                        <td>{c.enrolled}</td>
                        <td>{c.completed}</td>
                        <td>{c.completion_rate}%</td>
                        <td>{c.assignment_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div>
              <h2>Platform Insights</h2>
              <div className="analyst-cards">
                <div className="analyst-card">
                  <h3>Enrollments by Level</h3>
                  {insights?.enrollments_by_level?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={insights.enrollments_by_level} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="level" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                        <Bar dataKey="count" fill="#475569" radius={[4, 4, 0, 0]} name="Enrollments" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data">No enrollment data yet.</p>
                  )}
                </div>
                <div className="analyst-card">
                  <h3>Users by Role</h3>
                  {insights?.users_by_role?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={insights.users_by_role}
                          dataKey="count"
                          nameKey="role"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(e) => `${e.role}: ${e.count}`}
                        >
                          {insights.users_by_role.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data">No user data yet.</p>
                  )}
                </div>
                <div className="analyst-card analyst-card-wide">
                  <h3>Top 5 Courses by Enrollment</h3>
                  {insights?.top_courses_by_enrollment?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={insights.top_courses_by_enrollment}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="title" width={140} stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                        <Bar dataKey="enrollments" fill="#64748b" radius={[0, 4, 4, 0]} name="Enrollments" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="no-data">No course data yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'post' && (
            <div>
              <h2>Post Insight to Course</h2>
              <p className="analyst-hint">Generate analysis for a course and post it so enrolled students can see the insight.</p>
              <form onSubmit={handlePostInsight} className="analyst-post-form">
                <div className="form-group">
                  <label>Select Course</label>
                  <select
                    className="input analyst-input"
                    value={postInsightForm.course_id}
                    onChange={(e) => {
                      setPostInsightForm({ ...postInsightForm, course_id: e.target.value });
                      setSelectedCourseId(e.target.value);
                      if (e.target.value) {
                        loadCourseStats(e.target.value);
                        loadPostedInsights(e.target.value);
                      } else {
                        setCourseStats(null);
                        setPostedInsights([]);
                      }
                    }}
                    required
                  >
                    <option value="">Choose a course</option>
                    {courses.map((c) => (
                      <option key={c.course_id} value={c.course_id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Insight Title</label>
                  <input
                    type="text"
                    className="input analyst-input"
                    value={postInsightForm.title}
                    onChange={(e) => setPostInsightForm({ ...postInsightForm, title: e.target.value })}
                    placeholder="e.g. Grade distribution – DBMS"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Chart Type</label>
                  <select
                    className="input analyst-input"
                    value={postInsightForm.chart_type}
                    onChange={(e) => {
                      setPostInsightForm({ ...postInsightForm, chart_type: e.target.value });
                      if (selectedCourseId) loadCourseStats(selectedCourseId);
                    }}
                  >
                    <option value="grade_distribution">Grade distribution (bar)</option>
                    <option value="enrollment_status">Enrollment status (pie)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Summary (optional)</label>
                  <textarea
                    className="input analyst-input"
                    value={postInsightForm.summary}
                    onChange={(e) => setPostInsightForm({ ...postInsightForm, summary: e.target.value })}
                    placeholder="Brief description of the insight"
                    rows={3}
                  />
                </div>
                {courseStats && (
                  <div className="analyst-preview">
                    <h4>Preview</h4>
                    {postInsightForm.chart_type === 'grade_distribution' && courseStats.grade_distribution?.length > 0 && (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={courseStats.grade_distribution} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                          <Bar dataKey="count" fill="#475569" radius={[4, 4, 0, 0]} name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {postInsightForm.chart_type === 'enrollment_status' && (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Enrolled', count: courseStats.enrolled },
                              { name: 'Completed', count: courseStats.completed },
                              { name: 'Ongoing', count: courseStats.ongoing },
                            ]}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                          >
                            {[0, 1, 2].map((i) => (
                              <Cell key={i} fill={CHART_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
                <button type="submit" className="btn analyst-btn-primary">Post Insight</button>
              </form>
              {postedInsights.length > 0 && (
                <div className="analyst-posted-list">
                  <h3>Posted insights for this course</h3>
                  <ul>
                    {postedInsights.map((i) => (
                      <li key={i.insight_id}><strong>{i.title}</strong> – {new Date(i.created_at).toLocaleDateString()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalystDashboard;

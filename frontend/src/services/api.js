import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://coursehub-p4di.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  signup: async (name, email, password, role = 'student') => {
    const response = await api.post('/signup', { name, email, password, role });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getDashboardData: async (user_id, role) => {
    const response = await api.get('/dashboard', {
      params: { user_id, role },
    });
    return response.data;
  },
};

// Courses API
export const coursesAPI = {
  getAll: async () => {
    const response = await api.get('/courses');
    return response.data;
  },

  enroll: async (user_id, course_id) => {
    const response = await api.post('/courses/enroll', { user_id, course_id });
    return response.data;
  },

  getMyCourses: async (user_id, status = null) => {
    const params = { user_id };
    if (status) params.status = status;
    const response = await api.get('/courses/my-courses', { params });
    return response.data;
  },
};

// Student API
export const studentAPI = {
  getProfile: async (user_id) => {
    const response = await api.get('/student/profile', {
      params: { user_id },
    });
    return response.data;
  },

  updateProfile: async (user_id, profileData) => {
    const response = await api.put('/student/profile', {
      user_id,
      ...profileData,
    });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  deleteUser: async (user_id) => {
    const response = await api.delete(`/admin/users/${user_id}`);
    return response.data;
  },

  assignInstructor: async (instructor_id, course_id) => {
    const response = await api.post('/admin/assign', {
      instructor_id,
      course_id,
    });
    return response.data;
  },

  getCourses: async () => {
    const response = await api.get('/admin/courses');
    return response.data;
  },

  createCourse: async (admin_user_id, courseData) => {
    const response = await api.post('/admin/courses', {
      admin_user_id,
      ...courseData,
    });
    return response.data;
  },

  updateCourse: async (admin_user_id, course_id, courseData) => {
    const response = await api.put(`/admin/courses/${course_id}`, {
      admin_user_id,
      ...courseData,
    });
    return response.data;
  },

  deleteCourse: async (admin_user_id, course_id) => {
    const response = await api.delete(`/admin/courses/${course_id}`, {
      params: { admin_user_id },
    });
    return response.data;
  },

  getCourseInstructors: async (admin_user_id, course_id) => {
    const response = await api.get(`/admin/courses/${course_id}/instructors`, {
      params: { admin_user_id },
    });
    return response.data;
  },

  removeCourseInstructor: async (admin_user_id, course_id, instructor_id) => {
    const response = await api.delete(`/admin/courses/${course_id}/instructors/${instructor_id}`, {
      params: { admin_user_id },
    });
    return response.data;
  },

  getInstructors: async () => {
    const response = await api.get('/admin/instructors');
    return response.data;
  },

  approveUser: async (user_id) => {
    const response = await api.post('/admin/approve', { user_id });
    return response.data;
  },
};

// Instructor API
export const instructorAPI = {
  getProfile: async (user_id) => {
    const response = await api.get('/instructor/profile', { params: { user_id } });
    return response.data;
  },

  updateProfile: async (user_id, profileData) => {
    const response = await api.put('/instructor/profile', { user_id, ...profileData });
    return response.data;
  },

  getCourses: async (instructor_id) => {
    const response = await api.get('/instructor/courses', {
      params: { instructor_id },
    });
    return response.data;
  },

  getCourseStudents: async (instructor_id, course_id) => {
    const response = await api.get(`/instructor/courses/${course_id}/students`, {
      params: { instructor_id },
    });
    return response.data;
  },

  gradeStudent: async (instructor_id, course_id, student_id, grade, status = 'completed') => {
    const response = await api.post('/instructor/grade', {
      instructor_id,
      course_id,
      student_id,
      grade,
      status,
    });
    return response.data;
  },

  removeStudent: async (instructor_id, course_id, student_id) => {
    const response = await api.post('/instructor/remove-student', {
      instructor_id,
      course_id,
      student_id,
    });
    return response.data;
  },

  getCourseModules: async (instructor_id, course_id) => {
    const response = await api.get(`/instructor/courses/${course_id}/modules`, {
      params: { instructor_id },
    });
    return response.data;
  },

  createModule: async (instructor_id, course_id, module_number, name, duration = '') => {
    const response = await api.post('/instructor/module', {
      instructor_id,
      course_id,
      module_number,
      name,
      duration,
    });
    return response.data;
  },

  addModuleContent: async (instructor_id, course_id, module_number, title, type, url) => {
    const response = await api.post('/instructor/module-content', {
      instructor_id,
      course_id,
      module_number,
      title,
      type,
      url,
    });
    return response.data;
  },

  createAssignment: async (instructor_id, course_id, title, assignment_url, options = {}) => {
    const response = await api.post('/instructor/assignment', {
      instructor_id,
      course_id,
      title,
      assignment_url,
      module_number: options.module_number,
      description: options.description,
      due_date: options.due_date,
      max_marks: options.max_marks ?? 20,
    });
    return response.data;
  },

  getCourseAssignments: async (instructor_id, course_id) => {
    const response = await api.get(`/instructor/courses/${course_id}/assignments`, {
      params: { instructor_id },
    });
    return response.data;
  },

  getAssignmentSubmissions: async (instructor_id, assignment_id) => {
    const response = await api.get(`/instructor/assignments/${assignment_id}/submissions`, {
      params: { instructor_id },
    });
    return response.data;
  },

  gradeSubmission: async (instructor_id, submission_id, marks_obtained, feedback = '') => {
    const response = await api.post('/instructor/submission/grade', {
      instructor_id,
      submission_id,
      marks_obtained,
      feedback,
    });
    return response.data;
  },

  getAnnouncements: async (instructor_id, course_id) => {
    const response = await api.get(`/instructor/courses/${course_id}/announcements`, {
      params: { instructor_id },
    });
    return response.data;
  },

  createAnnouncement: async (instructor_id, course_id, title, content = '') => {
    const response = await api.post('/instructor/announcement', {
      instructor_id,
      course_id,
      title,
      content,
    });
    return response.data;
  },
};

// Student Course Content API
export const studentCourseAPI = {
  getCourseModules: async (user_id, course_id) => {
    const response = await api.get(`/student/courses/${course_id}/modules`, {
      params: { user_id },
    });
    return response.data;
  },

  getCourseAssignments: async (user_id, course_id) => {
    const response = await api.get(`/student/courses/${course_id}/assignments`, {
      params: { user_id },
    });
    return response.data;
  },

  submitAssignment: async (student_id, assignment_id, submission_url) => {
    const response = await api.post('/student/assignment/submit', {
      student_id,
      assignment_id,
      submission_url,
    });
    return response.data;
  },

  getAnnouncements: async (user_id, course_id) => {
    const response = await api.get(`/student/courses/${course_id}/announcements`, {
      params: { user_id },
    });
    return response.data;
  },

  getCourseInsights: async (user_id, course_id) => {
    const response = await api.get(`/student/courses/${course_id}/insights`, {
      params: { user_id },
    });
    return response.data;
  },
};

// Analyst API
export const analystAPI = {
  getOverview: async () => {
    const response = await api.get('/analyst/overview');
    return response.data;
  },
  getCourses: async () => {
    const response = await api.get('/analyst/courses');
    return response.data;
  },
  getInsights: async () => {
    const response = await api.get('/analyst/insights');
    return response.data;
  },
  getCourseStats: async (course_id) => {
    const response = await api.get(`/analyst/courses/${course_id}/stats`);
    return response.data;
  },
  getGradeDistribution: async (course_id) => {
    const response = await api.get(`/analyst/courses/${course_id}/grade-distribution`);
    return response.data;
  },
  postInsight: async (posted_by, course_id, title, chart_type, chart_data, summary = '') => {
    const response = await api.post('/analyst/insights/post', {
      posted_by,
      course_id,
      title,
      chart_type,
      chart_data,
      summary,
    });
    return response.data;
  },
  getInsightsByCourse: async (course_id) => {
    const response = await api.get('/analyst/insights/by-course', {
      params: { course_id },
    });
    return response.data;
  },
};

export default api;

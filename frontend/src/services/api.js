import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle errors & token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    if (error.response?.status !== 401) toast.error(message);

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Employees
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/employees/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  terminate: (id, data) => api.put(`/employees/${id}/terminate`, data),
  getStats: () => api.get('/employees/stats')
};

// Attendance
export const attendanceAPI = {
  getToday: () => api.get('/attendance/today'),
  getAll: (params) => api.get('/attendance', { params }),
  checkIn: (data) => api.post('/attendance/check-in', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  checkOut: (data) => api.put('/attendance/check-out', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getEmployeeHistory: (id, params) => api.get(`/attendance/employee/${id}`, { params }),
  manualEntry: (data) => api.post('/attendance/manual', data)
};

// Leaves
export const leaveAPI = {
  getTypes: () => api.get('/leaves/types'),
  getBalance: (employeeId, params) => api.get(`/leaves/balance/${employeeId}`, { params }),
  getAll: (params) => api.get('/leaves', { params }),
  apply: (data) => api.post('/leaves/apply', data),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, { ...data, status: 'approved' }),
  reject: (id, data) => api.put(`/leaves/${id}/reject`, { ...data, status: 'rejected' }),
  cancel: (id) => api.put(`/leaves/${id}/cancel`)
};

// Payroll
export const payrollAPI = {
  getRuns: (params) => api.get('/payroll', { params }),
  runPayroll: (data) => api.post('/payroll/run', data),
  getRunDetails: (id) => api.get(`/payroll/${id}`),
  getPayslip: (employeeId, month, year) => api.get(`/payroll/payslip/${employeeId}/${month}/${year}`),
  markPaid: (id) => api.put(`/payroll/${id}/pay`),
  getSalaryStructure: (employeeId) => api.get(`/payroll/salary/${employeeId}`),
  saveSalaryStructure: (employeeId, data) => api.post(`/payroll/salary/${employeeId}`, data)
};

// Recruitment
export const recruitmentAPI = {
  getJobs: (params) => api.get('/recruitment/jobs', { params }),
  createJob: (data) => api.post('/recruitment/jobs', data),
  updateJob: (id, data) => api.put(`/recruitment/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/recruitment/jobs/${id}`),
  getApplicants: (params) => api.get('/recruitment/applicants', { params }),
  addApplicant: (data) => api.post('/recruitment/applicants', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateApplicantStatus: (id, data) => api.put(`/recruitment/applicants/${id}/status`, data)
};

// Reports
export const reportAPI = {
  getDashboardStats: () => api.get('/reports/dashboard'),
  getAttendanceReport: (params) => api.get('/reports/attendance', { params }),
  getLeaveReport: (params) => api.get('/reports/leave', { params }),
  getPayrollReport: (params) => api.get('/reports/payroll', { params }),
  getEmployeeReport: (params) => api.get('/reports/employee', { params }),
  getOvertimeReport: (params) => api.get('/reports/overtime', { params }),
  getPerformanceReport: (params) => api.get('/reports/performance', { params })
};

// Settings
export const settingsAPI = {
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data) => api.put('/settings/company', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDepartments: () => api.get('/settings/departments'),
  createDepartment: (data) => api.post('/settings/departments', data),
  updateDepartment: (id, data) => api.put(`/settings/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/settings/departments/${id}`),
  getDesignations: (params) => api.get('/settings/designations', { params }),
  createDesignation: (data) => api.post('/settings/designations', data),
  getShifts: () => api.get('/settings/shifts'),
  createShift: (data) => api.post('/settings/shifts', data),
  updateShift: (id, data) => api.put(`/settings/shifts/${id}`, data),
  getHolidays: (params) => api.get('/settings/holidays', { params }),
  createHoliday: (data) => api.post('/settings/holidays', data),
  deleteHoliday: (id) => api.delete(`/settings/holidays/${id}`),
  getPayslipConfig: () => api.get('/settings/payslip-config'),
  updatePayslipConfig: (data) => api.put('/settings/payslip-config', data),
  getLeaveTypes: () => api.get('/settings/leave-types'),
  createLeaveType: (data) => api.post('/settings/leave-types', data),
  updateLeaveType: (id, data) => api.put(`/settings/leave-types/${id}`, data),
  deleteLeaveType: (id) => api.delete(`/settings/leave-types/${id}`),
};

// Email
export const emailAPI = {
  send: (data) => api.post('/emails/send', data),
  sendBulk: (data) => api.post('/emails/send-bulk', data),
  sendPayslips: (runId) => api.post(`/emails/send-payslips/${runId}`),
  getLogs: (params) => api.get('/emails/logs', { params }),
  getLogDetail: (id) => api.get(`/emails/logs/${id}`),
  verifySmtp: () => api.get('/emails/verify'),
};

// Documents
export const documentAPI = {
  getByEmployee: (id) => api.get(`/documents/employee/${id}`),
  upload: (data) => api.post('/documents/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  verify: (id) => api.put(`/documents/${id}/verify`),
  delete: (id) => api.delete(`/documents/${id}`)
};

export default api;

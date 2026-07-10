export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  HR: 'hr',
  EMPLOYEE: 'employee'
};

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee'
};

export const ROLE_COLORS = {
  superadmin: 'purple',
  admin: 'blue',
  hr: 'green',
  employee: 'gray'
};

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' }
];

export const EMPLOYMENT_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'on_leave', label: 'On Leave' }
];

export const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: 'green' },
  absent: { label: 'Absent', color: 'red' },
  late: { label: 'Late', color: 'yellow' },
  half_day: { label: 'Half Day', color: 'blue' },
  on_leave: { label: 'On Leave', color: 'purple' },
  holiday: { label: 'Holiday', color: 'gray' },
  weekend: { label: 'Weekend', color: 'gray' }
};

export const LEAVE_STATUS = {
  pending: { label: 'Pending', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' }
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'photo', label: 'Photograph' },
  { value: 'signature', label: 'Signature' },
  { value: 'resume', label: 'Resume/CV' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' }
];

export const APPLICANT_STAGES = [
  { value: 'applied', label: 'Applied', color: 'gray' },
  { value: 'screening', label: 'Screening', color: 'blue' },
  { value: 'interview', label: 'Interview', color: 'yellow' },
  { value: 'technical', label: 'Technical', color: 'purple' },
  { value: 'hr_round', label: 'HR Round', color: 'indigo' },
  { value: 'offer', label: 'Offer', color: 'green' },
  { value: 'hired', label: 'Hired', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

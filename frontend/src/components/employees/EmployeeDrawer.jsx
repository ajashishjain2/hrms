import { useState } from 'react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { attendanceAPI, leaveAPI, payrollAPI, documentAPI, employeeAPI } from '../../services/api';
import { useEffect } from 'react';
import { HiOutlineX, HiOutlineUser, HiOutlineClock, HiOutlineDocument, HiOutlineCurrencyRupee, HiOutlineCalendar, HiOutlineDownload, HiOutlineTrash, HiOutlineUpload, HiOutlinePencil } from 'react-icons/hi';
import { TableLoader, EmptyState } from '../common/LoadingSpinner';
import { MONTHS, DOCUMENT_TYPES } from '../../utils/constants';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import EditEmployeeModal from './EditEmployeeModal';

const TABS = [
  { key: 'profile', label: 'Profile', icon: HiOutlineUser },
  { key: 'attendance', label: 'Attendance', icon: HiOutlineClock },
  { key: 'leaves', label: 'Leaves', icon: HiOutlineCalendar },
  { key: 'payroll', label: 'Payroll', icon: HiOutlineCurrencyRupee },
  { key: 'documents', label: 'Documents', icon: HiOutlineDocument }
];

export default function EmployeeDrawer({ employee, onClose, onUpdate }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: 'aadhaar', document_name: '' });
  const [docFile, setDocFile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [localEmployee, setLocalEmployee] = useState(employee);
  const canEdit = user?.role === 'superadmin' || user?.role === 'admin';

  useEffect(() => { setLocalEmployee(employee); }, [employee]);

  const handleEditSuccess = async () => {
    setShowEdit(false);
    try {
      const { data } = await employeeAPI.getOne(employee.id);
      setLocalEmployee(data.data);
    } catch {}
    onUpdate();
  };

  const loadTabData = async (t) => {
    setLoading(true);
    try {
      if (t === 'attendance') {
        const { data } = await attendanceAPI.getEmployeeHistory(employee.id);
        setAttendance(data.data);
      } else if (t === 'leaves') {
        const [l, b] = await Promise.all([
          leaveAPI.getAll({ employee_id: employee.id }),
          leaveAPI.getBalance(employee.id)
        ]);
        setLeaves(l.data.data);
        setLeaveBalance(b.data.data);
      } else if (t === 'payroll') {
        const m = new Date().getMonth() + 1;
        const y = new Date().getFullYear();
        try {
          const { data } = await payrollAPI.getPayslip(employee.id, m, y);
          setPayroll(data.data);
        } catch { setPayroll(null); }
      } else if (t === 'documents') {
        const { data } = await documentAPI.getByEmployee(employee.id);
        setDocuments(data.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (tab !== 'profile') loadTabData(tab); }, [tab]);

  const handleDocUpload = async () => {
    if (!docFile) { toast.error('Please select a file'); return; }
    const fd = new FormData();
    fd.append('employee_id', employee.id);
    fd.append('document_type', docForm.document_type);
    fd.append('document_name', docForm.document_name);
    fd.append('document', docFile);
    try {
      await documentAPI.upload(fd);
      toast.success('Document uploaded');
      setDocFile(null);
      loadTabData('documents');
    } catch {}
  };

  const handleDocDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(id);
      toast.success('Deleted');
      setDocuments(d => d.filter(doc => doc.id !== id));
    } catch {}
  };

  return (
    <>
      <div className="drawer-overlay animate-fade-in" onClick={onClose} />
      <div className="drawer-lg animate-slide-in flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <Avatar src={localEmployee.photo} name={`${localEmployee.first_name} ${localEmployee.last_name}`} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{localEmployee.first_name} {localEmployee.last_name}</h2>
            <p className="text-gray-500 text-sm">{localEmployee.designation_title} · {localEmployee.department_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge status={localEmployee.employment_status} label={localEmployee.employment_status?.replace('_', ' ')} />
              <span className="text-xs text-gray-400">{localEmployee.employee_code}</span>
              <span className="badge-blue badge text-xs">{localEmployee.employment_type?.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button onClick={() => setShowEdit(true)} className="btn-icon btn-secondary" title="Edit Employee">
                <HiOutlinePencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className="space-y-6">
              <Section title="Contact & Personal">
                <Grid>
                  <Field label="Email" value={localEmployee.email} />
                  <Field label="Phone" value={localEmployee.phone} />
                  <Field label="Date of Birth" value={formatDate(localEmployee.date_of_birth)} />
                  <Field label="Gender" value={localEmployee.gender} className="capitalize" />
                  <Field label="Blood Group" value={localEmployee.blood_group} />
                  <Field label="Marital Status" value={localEmployee.marital_status} className="capitalize" />
                </Grid>
              </Section>
              <Section title="Employment">
                <Grid>
                  <Field label="Date of Joining" value={formatDate(localEmployee.date_of_joining)} />
                  <Field label="Shift" value={localEmployee.shift_name} />
                  <Field label="Basic Salary" value={formatCurrency(localEmployee.basic_salary)} />
                  <Field label="PF Number" value={localEmployee.pf_number} />
                  <Field label="PAN" value={localEmployee.pan_number} />
                  <Field label="Aadhaar" value={localEmployee.aadhaar_number} />
                </Grid>
              </Section>
              <Section title="Bank Details">
                <Grid>
                  <Field label="Bank" value={localEmployee.bank_name} />
                  <Field label="Account No." value={localEmployee.bank_account_number} />
                  <Field label="IFSC" value={localEmployee.bank_ifsc} />
                </Grid>
              </Section>
              <Section title="Emergency Contact">
                <Grid>
                  <Field label="Name" value={localEmployee.emergency_contact_name} />
                  <Field label="Phone" value={localEmployee.emergency_contact_phone} />
                </Grid>
              </Section>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {tab === 'attendance' && (
            loading ? <TableLoader /> : !attendance ? <EmptyState title="No attendance data" /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Present', value: attendance.stats?.present, color: 'text-green-600' },
                    { label: 'Absent', value: attendance.stats?.absent, color: 'text-red-600' },
                    { label: 'Late', value: attendance.stats?.late, color: 'text-yellow-600' },
                    { label: 'OT Hours', value: `${attendance.stats?.total_overtime || 0}h`, color: 'text-blue-600' }
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      {['Date', 'In', 'Out', 'Hours', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendance.records?.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{formatDate(r.attendance_date)}</td>
                          <td className="px-3 py-2 text-gray-600">{r.check_in_time ? formatDate(r.check_in_time, 'hh:mm a') : '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.check_out_time ? formatDate(r.check_out_time, 'hh:mm a') : '-'}</td>
                          <td className="px-3 py-2 font-medium">{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                          <td className="px-3 py-2"><Badge status={r.status} label={r.status?.replace('_', ' ')} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* LEAVES TAB */}
          {tab === 'leaves' && (
            loading ? <TableLoader /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {leaveBalance.slice(0, 3).map(b => (
                    <div key={b.id} className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-700">{b.leave_type_name}</p>
                      <p className="text-xl font-bold text-blue-900 mt-1">{b.remaining_days}</p>
                      <p className="text-xs text-blue-600">/{b.total_days} remaining</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      {['Type', 'From', 'To', 'Days', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaves.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2"><span className="badge-blue badge">{l.leave_code}</span></td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(l.from_date)}</td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(l.to_date)}</td>
                          <td className="px-3 py-2 font-medium">{l.total_days}</td>
                          <td className="px-3 py-2"><Badge status={l.status} label={l.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* PAYROLL TAB */}
          {tab === 'payroll' && (
            loading ? <TableLoader /> : !payroll ? <EmptyState title="No payslip for current month" /> : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-6 text-white">
                  <p className="text-sm opacity-80">Net Pay — {MONTHS[payroll.month - 1]} {payroll.year}</p>
                  <p className="text-4xl font-bold mt-1">{formatCurrency(payroll.net_salary)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs text-green-700 font-medium mb-2">EARNINGS</p>
                    {[['Basic', payroll.basic], ['HRA', payroll.hra], ['DA', payroll.da], ['TA', payroll.ta], ['Medical', payroll.medical_allowance]].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-sm py-1 border-b border-green-100 last:border-0">
                        <span className="text-gray-600">{l}</span>
                        <span className="font-medium text-green-700">{formatCurrency(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 font-bold text-green-800">
                      <span>Gross</span><span>{formatCurrency(payroll.gross_salary)}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-xs text-red-700 font-medium mb-2">DEDUCTIONS</p>
                    {[['PF', payroll.pf_deduction], ['ESI', payroll.esi_deduction], ['Prof. Tax', payroll.professional_tax]].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-sm py-1 border-b border-red-100 last:border-0">
                        <span className="text-gray-600">{l}</span>
                        <span className="font-medium text-red-700">{formatCurrency(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 font-bold text-red-800">
                      <span>Total Ded.</span><span>{formatCurrency(payroll.total_deductions)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-center">Attendance: {payroll.present_days} days present · {payroll.absent_days} days absent</div>
              </div>
            )
          )}

          {/* DOCUMENTS TAB */}
          {tab === 'documents' && (
            <div className="space-y-4">
              {/* Upload */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <select className="input text-sm col-span-1" value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))}>
                    {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <input className="input text-sm col-span-1" placeholder="Document name" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} />
                  <label className="btn-secondary cursor-pointer text-sm justify-center">
                    <HiOutlineUpload className="w-4 h-4" /> {docFile ? docFile.name.slice(0, 12) + '...' : 'Choose File'}
                    <input type="file" className="hidden" onChange={e => setDocFile(e.target.files[0])} />
                  </label>
                </div>
                <button onClick={handleDocUpload} disabled={!docFile} className="btn-primary btn-sm w-full justify-center">Upload Document</button>
              </div>

              {/* Documents List */}
              {loading ? <TableLoader /> : documents.length === 0 ? <EmptyState title="No documents uploaded" /> : (
                <div className="grid grid-cols-2 gap-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.document_name || doc.document_type}</p>
                        <p className="text-xs text-gray-400 capitalize">{doc.document_type?.replace('_', ' ')}</p>
                        {doc.is_verified && <span className="badge-green badge text-xs mt-1">Verified</span>}
                      </div>
                      <div className="flex gap-1">
                        <a href={`/uploads/${doc.file_path}`} target="_blank" rel="noopener noreferrer"
                          className="btn-icon btn-secondary" title="View">
                          <HiOutlineDownload className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDocDelete(doc.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditEmployeeModal
          employee={localEmployee}
          onClose={() => setShowEdit(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</h4>
    {children}
  </div>
);

const Grid = ({ children }) => <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;

const Field = ({ label, value, className = '' }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className={`text-sm font-medium text-gray-800 mt-0.5 ${className}`}>{value || '—'}</p>
  </div>
);

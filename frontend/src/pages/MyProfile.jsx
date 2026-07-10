import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeAPI, leaveAPI, attendanceAPI } from '../services/api';
import { formatDate, formatCurrency } from '../utils/helpers';
import Avatar from '../components/common/Avatar';
import { TableLoader } from '../components/common/LoadingSpinner';
import {
  HiOutlineUser, HiOutlineClock, HiOutlineCalendar,
  HiOutlineBriefcase, HiOutlineOfficeBuilding, HiOutlinePhone,
  HiOutlineMail, HiOutlineLocationMarker, HiOutlineIdentification,
  HiOutlineCreditCard, HiOutlineShieldCheck
} from 'react-icons/hi';

const Field = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value || <span className="text-gray-300 italic text-xs">Not provided</span>}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
    </div>
    <div className="px-4 py-1">{children}</div>
  </div>
);

export default function MyProfile() {
  const { user } = useAuth();
  const [emp, setEmp] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (!user?.employee_id) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data } = await employeeAPI.getOne(user.employee_id);
        setEmp(data.data);
      } catch {}
      try {
        const [l, b] = await Promise.all([
          leaveAPI.getAll({ employee_id: user.employee_id, limit: 20 }),
          leaveAPI.getBalance(user.employee_id),
        ]);
        setLeaves(l.data.data?.leaves || l.data.data || []);
        setBalance(b.data.data || []);
      } catch {}
      try {
        const { data } = await attendanceAPI.getEmployeeHistory(user.employee_id, { limit: 20 });
        setAttendance(data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user?.employee_id) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <HiOutlineUser className="w-16 h-16 text-gray-300" />
      <p className="text-gray-500">No employee profile linked to your account.</p>
      <p className="text-xs text-gray-400">Contact your HR administrator.</p>
    </div>
  );

  const TABS = [
    { id: 'profile',    label: 'Profile',    icon: HiOutlineUser },
    { id: 'attendance', label: 'Attendance', icon: HiOutlineClock },
    { id: 'leaves',     label: 'Leaves',     icon: HiOutlineCalendar },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Profile Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-5">
        <div className="flex-shrink-0">
          <Avatar name={`${emp?.first_name} ${emp?.last_name}`} src={emp?.photo ? `/uploads/${emp.photo}` : null} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900">{emp?.first_name} {emp?.last_name}</h2>
          <p className="text-sm text-gray-500">{emp?.designation_title} · {emp?.department_name}</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">{emp?.employee_code}</p>
        </div>
        <div className="text-right">
          <span className={`badge ${emp?.employment_status === 'active' ? 'badge-green' : 'badge-gray'}`}>
            {emp?.employment_status}
          </span>
          <p className="text-xs text-gray-400 mt-2">Joined {formatDate(emp?.date_of_joining)}</p>
        </div>
      </div>

      {/* Readonly notice */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
        <HiOutlineShieldCheck className="w-4 h-4 flex-shrink-0" />
        This is a read-only view of your profile. To update any information, contact your HR administrator.
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && emp && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Personal Information">
            <Field label="Full Name"        value={`${emp.first_name} ${emp.last_name}`} icon={HiOutlineUser} />
            <Field label="Date of Birth"    value={formatDate(emp.date_of_birth)}        icon={HiOutlineIdentification} />
            <Field label="Gender"           value={emp.gender}                            icon={HiOutlineUser} />
            <Field label="Personal Email"   value={emp.personal_email}                   icon={HiOutlineMail} />
            <Field label="Phone"            value={emp.phone}                             icon={HiOutlinePhone} />
            <Field label="Address"          value={emp.address}                           icon={HiOutlineLocationMarker} />
          </Section>

          <Section title="Employment Details">
            <Field label="Employee Code"    value={emp.employee_code}                     icon={HiOutlineIdentification} />
            <Field label="Work Email"       value={emp.work_email}                        icon={HiOutlineMail} />
            <Field label="Department"       value={emp.department_name}                   icon={HiOutlineOfficeBuilding} />
            <Field label="Designation"      value={emp.designation_title}                 icon={HiOutlineBriefcase} />
            <Field label="Employment Type"  value={emp.employment_type}                   icon={HiOutlineBriefcase} />
            <Field label="Date of Joining"  value={formatDate(emp.date_of_joining)}       icon={HiOutlineCalendar} />
            <Field label="Reporting Manager" value={emp.manager_name}                    icon={HiOutlineUser} />
          </Section>

          <Section title="Bank & Statutory Details">
            <Field label="PAN Number"       value={emp.pan_number}          icon={HiOutlineIdentification} />
            <Field label="PF Number"        value={emp.pf_number}           icon={HiOutlineShieldCheck} />
            <Field label="ESI Number"       value={emp.esi_number}          icon={HiOutlineShieldCheck} />
            <Field label="Bank Name"        value={emp.bank_name}           icon={HiOutlineCreditCard} />
            <Field label="Account Number"   value={emp.bank_account_number ? '••••' + emp.bank_account_number.slice(-4) : null} icon={HiOutlineCreditCard} />
            <Field label="IFSC Code"        value={emp.bank_ifsc}           icon={HiOutlineCreditCard} />
          </Section>

          <Section title="Emergency Contact">
            <Field label="Contact Name"     value={emp.emergency_contact_name}   icon={HiOutlineUser} />
            <Field label="Relationship"     value={emp.emergency_contact_relation} icon={HiOutlineUser} />
            <Field label="Phone"            value={emp.emergency_contact_phone}  icon={HiOutlinePhone} />
          </Section>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {!attendance ? <TableLoader /> : (
            <>
              {/* Stats */}
              {attendance.stats && (
                <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                  {[
                    { label: 'Present', value: attendance.stats.present, color: 'text-green-600' },
                    { label: 'Late',    value: attendance.stats.late,    color: 'text-yellow-600' },
                    { label: 'Absent',  value: attendance.stats.absent,  color: 'text-red-500' },
                    { label: 'On Leave',value: attendance.stats.on_leave, color: 'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="py-3 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['Date','Check In','Check Out','Hours','Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(attendance.records || []).slice(0, 30).map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">{formatDate(r.attendance_date)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                        <td className="px-4 py-2.5">{r.work_hours ? `${r.work_hours}h` : '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`badge ${r.status === 'present' ? 'badge-green' : r.status === 'late' ? 'badge-yellow' : r.status === 'absent' ? 'badge-red' : 'badge-gray'}`}>
                            {r.status?.replace('_',' ')}
                          </span>
                          {r.is_wfh === 1 && <span className="ml-1 badge badge-blue">WFH</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Leaves Tab */}
      {tab === 'leaves' && (
        <div className="space-y-4">
          {/* Leave balance */}
          {balance.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balance.map(b => (
                <div key={b.leave_type_id} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">{b.remaining_days ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{b.leave_type_name}</p>
                  <p className="text-xs text-gray-400">{b.used_days ?? 0} used / {b.allocated_days ?? 0} total</p>
                </div>
              ))}
            </div>
          )}
          {/* Leave history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-800">Leave History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Type','From','To','Days','Status','Reason'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No leave records found</td></tr>
                  ) : leaves.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{l.leave_type_name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{formatDate(l.start_date)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{formatDate(l.end_date)}</td>
                      <td className="px-4 py-2.5">{l.total_days}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : l.status === 'pending' ? 'badge-yellow' : 'badge-gray'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

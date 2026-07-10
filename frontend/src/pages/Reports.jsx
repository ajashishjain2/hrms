import { useState, useEffect } from 'react';
import { reportAPI, settingsAPI } from '../services/api';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate, downloadCSV } from '../utils/helpers';
import { MONTHS } from '../utils/constants';
import { HiOutlineDownload, HiOutlineRefresh } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const REPORT_TYPES = ['Attendance', 'Leave', 'Payroll', 'Employee', 'Overtime'];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('Attendance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [filter, setFilter] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    department_id: ''
  });

  useEffect(() => {
    settingsAPI.getDepartments().then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setData([]);
    try {
      let res;
      const p = { ...filter };
      switch (activeReport) {
        case 'Attendance': res = await reportAPI.getAttendanceReport({ from: p.from, to: p.to, department_id: p.department_id || undefined }); break;
        case 'Leave': res = await reportAPI.getLeaveReport({ year: p.year, department_id: p.department_id || undefined }); break;
        case 'Payroll': res = await reportAPI.getPayrollReport({ month: p.month, year: p.year }); break;
        case 'Employee': res = await reportAPI.getEmployeeReport({ department_id: p.department_id || undefined }); break;
        case 'Overtime': res = await reportAPI.getOvertimeReport({ month: p.month, year: p.year, department_id: p.department_id || undefined }); break;
        default: res = { data: { data: [] } };
      }
      setData(res.data.data || res.data.data?.details || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [activeReport]);

  const renderTable = () => {
    if (loading) return <TableLoader />;
    if (!data?.length) return <EmptyState title="No data for selected filters" />;

    const columns = {
      Attendance: [
        { key: 'employee_code', label: 'Code' },
        { key: 'employee_name', label: 'Employee' },
        { key: 'department', label: 'Department' },
        { key: 'present_days', label: 'Present' },
        { key: 'absent_days', label: 'Absent' },
        { key: 'late_days', label: 'Late' },
        { key: 'total_work_hours', label: 'Total Hours' },
        { key: 'total_overtime_hours', label: 'Overtime' }
      ],
      Leave: [
        { key: 'employee_code', label: 'Code' },
        { key: 'employee_name', label: 'Employee' },
        { key: 'department', label: 'Department' },
        { key: 'leave_type', label: 'Leave Type' },
        { key: 'total_days', label: 'Allotted' },
        { key: 'used_days', label: 'Used' },
        { key: 'pending_days', label: 'Pending' },
        { key: 'remaining_days', label: 'Remaining' }
      ],
      Payroll: [
        { key: 'employee_code', label: 'Code' },
        { key: 'employee_name', label: 'Employee' },
        { key: 'department_name', label: 'Department' },
        { key: 'present_days', label: 'Days' },
        { key: 'gross_salary', label: 'Gross', format: formatCurrency },
        { key: 'total_deductions', label: 'Deductions', format: formatCurrency },
        { key: 'net_salary', label: 'Net Pay', format: formatCurrency }
      ],
      Employee: [
        { key: 'employee_code', label: 'Code' },
        { key: 'first_name', label: 'Name', render: r => `${r.first_name} ${r.last_name}` },
        { key: 'department_name', label: 'Department' },
        { key: 'designation_title', label: 'Designation' },
        { key: 'employment_type', label: 'Type' },
        { key: 'date_of_joining', label: 'Joined', format: formatDate },
        { key: 'basic_salary', label: 'Basic', format: formatCurrency }
      ],
      Overtime: [
        { key: 'employee_code', label: 'Code' },
        { key: 'employee_name', label: 'Employee' },
        { key: 'department_name', label: 'Department' },
        { key: 'overtime_days', label: 'OT Days' },
        { key: 'total_overtime_hours', label: 'OT Hours' },
        { key: 'estimated_overtime_pay', label: 'Est. Pay', format: formatCurrency }
      ]
    };

    const cols = columns[activeReport] || [];

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {cols.map(c => <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {cols.map(c => (
                  <td key={c.key} className="px-4 py-3 text-gray-700">
                    {c.render ? c.render(row) : c.format ? c.format(row[c.key]) : row[c.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1 overflow-x-auto">
        {REPORT_TYPES.map(type => (
          <button key={type} onClick={() => setActiveReport(type)}
            className={`flex-1 min-w-24 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${activeReport === type ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            {type}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        {['Attendance'].includes(activeReport) && (
          <>
            <div><label className="label">From</label><input type="date" className="input" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} /></div>
            <div><label className="label">To</label><input type="date" className="input" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} /></div>
          </>
        )}
        {['Payroll', 'Overtime'].includes(activeReport) && (
          <>
            <div><label className="label">Month</label>
              <select className="input" value={filter.month} onChange={e => setFilter(f => ({ ...f, month: +e.target.value }))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Year</label>
              <select className="input" value={filter.year} onChange={e => setFilter(f => ({ ...f, year: +e.target.value }))}>
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}
        {['Leave'].includes(activeReport) && (
          <div><label className="label">Year</label>
            <select className="input" value={filter.year} onChange={e => setFilter(f => ({ ...f, year: +e.target.value }))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Department</label>
          <select className="input" value={filter.department_id} onChange={e => setFilter(f => ({ ...f, department_id: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={fetchReport} className="btn-primary"><HiOutlineRefresh className="w-4 h-4" /> Generate</button>
          <button onClick={() => downloadCSV(data, `${activeReport}-report-${Date.now()}`)} disabled={!data?.length} className="btn-secondary">
            <HiOutlineDownload className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{activeReport} Report</h3>
          <span className="text-sm text-gray-500">{data?.length || 0} records</span>
        </div>
        {renderTable()}
      </div>
    </div>
  );
}

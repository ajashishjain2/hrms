import { useState, useEffect, useCallback } from 'react';
import { employeeAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import EmployeeDrawer from '../components/employees/EmployeeDrawer';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';
import { formatDate, formatCurrency } from '../utils/helpers';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineFilter, HiOutlineEye, HiOutlineDownload, HiOutlineMail } from 'react-icons/hi';
import EmailCompose from '../components/common/EmailCompose';
import toast from 'react-hot-toast';

export default function Employees() {
  const { canAccess } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('active');
  const [departments, setDepartments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await employeeAPI.getAll({ page, limit: pagination.limit, search, department, status });
      setEmployees(data.data);
      setPagination(p => ({ ...p, ...data.pagination }));
    } catch {}
    setLoading(false);
  }, [search, department, status, pagination.limit]);

  useEffect(() => {
    settingsAPI.getDepartments().then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(1), 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text" placeholder="Search employees..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select value={department} onChange={e => setDepartment(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
        <div className="ml-auto flex gap-2">
          <span className="text-sm text-gray-500 py-2">{pagination.total} employees</span>
          {canAccess('hr') && (
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <HiOutlinePlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <TableLoader /> : employees.length === 0 ? (
          <EmptyState title="No employees found" message="Try adjusting your search filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Employee', 'Department', 'Designation', 'Shift', 'Join Date', 'Salary', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={emp.photo} name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.employee_code} · {emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.department_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.designation_title || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.shift_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(emp.date_of_joining)}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{formatCurrency(emp.basic_salary)}</td>
                    <td className="px-4 py-3">
                      <Badge status={emp.employment_status} label={emp.employment_status?.replace('_', ' ')} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelected(emp)} className="btn-icon btn-secondary" title="View Profile">
                          <HiOutlineEye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEmailTarget(emp)} className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200" title="Send Email">
                          <HiOutlineMail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button disabled={pagination.page === 1} onClick={() => fetchEmployees(pagination.page - 1)} className="btn-secondary btn-sm">Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchEmployees(pagination.page + 1)} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchEmployees(1); toast.success('Employee added!'); }}
        />
      )}

      {/* Employee Detail Drawer */}
      {selected && (
        <EmployeeDrawer
          employee={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => fetchEmployees(pagination.page)}
        />
      )}

      {/* Email Compose */}
      <EmailCompose
        isOpen={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        defaultEmployee={emailTarget}
      />
    </div>
  );
}

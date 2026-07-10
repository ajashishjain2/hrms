import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { formatDate, formatCurrency } from '../utils/helpers';
import { HiOutlineClock, HiOutlineLocationMarker, HiOutlinePlus, HiOutlineRefresh, HiOutlineHome } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { user, canAccess } = useAuth();
  const { on, off } = useSocket();
  const [tab, setTab] = useState('today');
  const [todayData, setTodayData] = useState({ records: [], stats: {} });
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });
  const [departments, setDepartments] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ employee_id: '', attendance_date: new Date().toISOString().split('T')[0], check_in_time: '', check_out_time: '', status: 'present', remarks: '' });

  const loadToday = useCallback(async () => {
    try {
      const { data } = await attendanceAPI.getToday();
      setTodayData(data.data);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getAll(filter);
      setAllData(data.data);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    settingsAPI.getDepartments().then(({ data }) => setDepartments(data.data)).catch(() => {});
    loadToday().then(() => setLoading(false));
  }, []);

  useEffect(() => { if (tab === 'all') loadAll(); }, [tab, loadAll]);

  // Live updates via socket
  useEffect(() => {
    const handler = () => loadToday();
    on('attendance:checkin', handler);
    on('attendance:checkout', handler);
    return () => { off('attendance:checkin', handler); off('attendance:checkout', handler); };
  }, [on, off, loadToday]);

  const handleManualSubmit = async () => {
    try {
      await attendanceAPI.manualEntry(manualForm);
      toast.success('Attendance updated');
      setShowManual(false);
      loadToday();
    } catch {}
  };

  const statusConfig = {
    present: 'badge-green', absent: 'badge-red', late: 'badge-yellow',
    half_day: 'badge-blue', on_leave: 'badge-purple'
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: todayData?.stats?.total_employees, color: 'text-gray-700' },
          { label: 'Present', value: todayData?.stats?.present, color: 'text-green-600' },
          { label: 'Absent', value: todayData?.stats?.absent, color: 'text-red-600' },
          { label: 'On Leave', value: todayData?.stats?.on_leave, color: 'text-purple-600' }
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-4 pt-3 gap-2">
          {['today', 'all'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize
                ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'today' ? "Today's Register" : 'All Records'}
            </button>
          ))}
          <div className="ml-auto flex gap-2 pb-3">
            <button onClick={() => tab === 'today' ? loadToday() : loadAll()} className="btn-secondary btn-sm">
              <HiOutlineRefresh className="w-3.5 h-3.5" /> Refresh
            </button>
            {canAccess('hr') && (
              <button onClick={() => setShowManual(true)} className="btn-primary btn-sm">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Manual Entry
              </button>
            )}
          </div>
        </div>

        {/* Today's Records */}
        {tab === 'today' && (
          loading ? <TableLoader /> :
          todayData.records.length === 0 ? <EmptyState title="No attendance records today" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Employee', 'Dept', 'Check In', 'Check Out', 'Hours', 'WFH', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayData.records.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={r.photo} name={r.employee_name} size="sm" />
                          <div>
                            <p className="font-medium">{r.employee_name}</p>
                            <p className="text-xs text-gray-400">{r.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.department_name || '-'}</td>
                      <td className="px-4 py-3">
                        {r.check_in_time ? (
                          <div>
                            <p className="font-medium">{formatDate(r.check_in_time, 'hh:mm a')}</p>
                            {r.check_in_address && <p className="text-xs text-gray-400 flex items-center gap-1"><HiOutlineLocationMarker className="w-3 h-3" />{r.check_in_address.slice(0, 30)}</p>}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3">{r.check_out_time ? formatDate(r.check_out_time, 'hh:mm a') : <span className="text-gray-400">-</span>}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                      <td className="px-4 py-3">{r.is_wfh ? <span className="badge-blue badge text-xs">WFH</span> : '-'}</td>
                      <td className="px-4 py-3"><Badge status={r.status} label={r.status?.replace('_', ' ')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* All Records */}
        {tab === 'all' && (
          <div>
            <div className="p-4 flex gap-3 flex-wrap border-b border-gray-100">
              <input type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="date" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={loadAll} className="btn-primary btn-sm">Apply</button>
            </div>
            {loading ? <TableLoader /> : allData.length === 0 ? <EmptyState title="No records found" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allData.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.employee_name}</p>
                          <p className="text-xs text-gray-400">{r.employee_code}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(r.attendance_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{r.check_in_time ? formatDate(r.check_in_time, 'hh:mm a') : '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.check_out_time ? formatDate(r.check_out_time, 'hh:mm a') : '-'}</td>
                        <td className="px-4 py-3 font-medium">{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                        <td className="px-4 py-3"><Badge status={r.status} label={r.status?.replace('_', ' ')} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal isOpen={showManual} onClose={() => setShowManual(false)} title="Manual Attendance Entry" size="sm"
        footer={<><button onClick={() => setShowManual(false)} className="btn-secondary">Cancel</button><button onClick={handleManualSubmit} className="btn-primary">Save</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Employee ID</label>
            <input className="input" placeholder="Employee ID" value={manualForm.employee_id}
              onChange={e => setManualForm(f => ({ ...f, employee_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={manualForm.attendance_date}
              onChange={e => setManualForm(f => ({ ...f, attendance_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Check In</label><input type="datetime-local" className="input" value={manualForm.check_in_time} onChange={e => setManualForm(f => ({ ...f, check_in_time: e.target.value }))} /></div>
            <div><label className="label">Check Out</label><input type="datetime-local" className="input" value={manualForm.check_out_time} onChange={e => setManualForm(f => ({ ...f, check_out_time: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={manualForm.status} onChange={e => setManualForm(f => ({ ...f, status: e.target.value }))}>
              {['present','absent','late','half_day','on_leave','holiday'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Remarks</label><textarea className="input" rows={2} value={manualForm.remarks} onChange={e => setManualForm(f => ({ ...f, remarks: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}

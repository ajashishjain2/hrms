import { useState, useEffect, useCallback } from 'react';
import { leaveAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';
import { LEAVE_STATUS } from '../utils/constants';
import toast from 'react-hot-toast';

export default function Leaves() {
  const { user, canAccess } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: canAccess('hr') ? 'pending' : '' });
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await leaveAPI.getAll(filter);
      setLeaves(data.data);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    leaveAPI.getTypes().then(({ data }) => setLeaveTypes(data.data)).catch(() => {});
    if (user?.employee_id) {
      leaveAPI.getBalance(user.employee_id).then(({ data }) => setBalance(data.data)).catch(() => {});
    }
  }, [user]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApply = async () => {
    if (!applyForm.leave_type_id || !applyForm.from_date || !applyForm.to_date) {
      toast.error('Please fill all required fields'); return;
    }
    setActionLoading(true);
    try {
      await leaveAPI.apply(applyForm);
      toast.success('Leave applied successfully');
      setShowApply(false);
      setApplyForm({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
      fetchLeaves();
      if (user?.employee_id) {
        leaveAPI.getBalance(user.employee_id).then(({ data }) => setBalance(data.data)).catch(() => {});
      }
    } catch {}
    setActionLoading(false);
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await leaveAPI.approve(id, {});
      toast.success('Leave approved');
      fetchLeaves();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await leaveAPI.reject(rejectModal.id, { review_remarks: rejectReason });
      toast.success('Leave rejected');
      setRejectModal(null);
      fetchLeaves();
    } catch {}
    setActionLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Leave Balance Cards */}
      {balance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {balance.slice(0, 4).map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">{b.leave_type_name}</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-bold text-primary-600">{b.remaining_days}</span>
                <span className="text-sm text-gray-400 mb-0.5">/ {b.total_days} days</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (b.used_days / b.total_days) * 100 || 0)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{b.used_days} used · {b.pending_days} pending</p>
            </div>
          ))}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${filter.status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={fetchLeaves} className="btn-secondary btn-sm"><HiOutlineRefresh className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowApply(true)} className="btn-primary btn-sm">
              <HiOutlinePlus className="w-4 h-4" /> Apply Leave
            </button>
          </div>
        </div>

        {loading ? <TableLoader /> : leaves.length === 0 ? <EmptyState title="No leave applications" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Applied', 'Status', ...(canAccess('hr') ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={l.photo} name={l.employee_name} size="sm" />
                        <div>
                          <p className="font-medium">{l.employee_name}</p>
                          <p className="text-xs text-gray-400">{l.department_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="badge-blue badge">{l.leave_code}</span></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(l.from_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(l.to_date)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{l.total_days}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{l.reason || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(l.applied_at)}</td>
                    <td className="px-4 py-3"><Badge status={l.status} label={LEAVE_STATUS[l.status]?.label} /></td>
                    {canAccess('hr') && (
                      <td className="px-4 py-3">
                        {l.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleApprove(l.id)} disabled={actionLoading}
                              className="btn-icon bg-green-50 text-green-600 hover:bg-green-100 border border-green-200" title="Approve">
                              <HiOutlineCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => setRejectModal(l)} disabled={actionLoading}
                              className="btn-icon bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" title="Reject">
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal isOpen={showApply} onClose={() => setShowApply(false)} title="Apply for Leave" size="sm"
        footer={<><button onClick={() => setShowApply(false)} className="btn-secondary">Cancel</button><button onClick={handleApply} disabled={actionLoading} className="btn-primary">{actionLoading ? 'Applying...' : 'Apply'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Leave Type *</label>
            <select className="input" value={applyForm.leave_type_id} onChange={e => setApplyForm(f => ({ ...f, leave_type_id: e.target.value }))}>
              <option value="">Select Leave Type</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From Date *</label><input type="date" className="input" value={applyForm.from_date} onChange={e => setApplyForm(f => ({ ...f, from_date: e.target.value }))} /></div>
            <div><label className="label">To Date *</label><input type="date" className="input" value={applyForm.to_date} onChange={e => setApplyForm(f => ({ ...f, to_date: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={3} placeholder="Reason for leave..." value={applyForm.reason} onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave" size="sm"
        footer={<><button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button><button onClick={handleReject} disabled={actionLoading} className="btn-danger">{actionLoading ? 'Rejecting...' : 'Reject'}</button></>}>
        <p className="text-sm text-gray-600 mb-3">Rejecting leave for <strong>{rejectModal?.employee_name}</strong></p>
        <textarea className="input" rows={3} placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>
    </div>
  );
}

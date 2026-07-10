import { useState, useEffect, useCallback } from 'react';
import { emailAPI } from '../services/api';
import { TableLoader } from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import EmailCompose from '../components/common/EmailCompose';
import { formatDate } from '../utils/helpers';
import {
  HiOutlineMail, HiOutlineRefresh, HiOutlineSearch, HiOutlineEye,
  HiOutlinePlus, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineWifi
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const TYPE_BADGE = {
  payslip:      'badge-blue',
  custom:       'badge-gray',
  announcement: 'badge-green',
  leave:        'badge-yellow',
  other:        'badge-gray',
};

const STATUS_BADGE = {
  sent:   'badge-green',
  failed: 'badge-red',
};

export default function EmailLogs() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filterType, setType]   = useState('');
  const [filterStatus, setStatus] = useState('');
  const [preview, setPreview]   = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [compose, setCompose]   = useState(false);
  const [smtpChecking, setSmtpChecking] = useState(false);

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await emailAPI.getLogs({ page, limit: LIMIT, search, type: filterType, status: filterStatus });
      setLogs(data.data.logs);
      setTotal(data.data.total);
    } catch {}
    setLoading(false);
  }, [page, search, filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const openPreview = async (id) => {
    setPreviewLoading(true);
    setPreview({ loading: true });
    try {
      const { data } = await emailAPI.getLogDetail(id);
      setPreview(data.data);
    } catch {}
    setPreviewLoading(false);
  };

  const checkSmtp = async () => {
    setSmtpChecking(true);
    try {
      const { data } = await emailAPI.verifySmtp();
      data.success ? toast.success('SMTP connected successfully') : toast.error(data.message);
    } catch {}
    setSmtpChecking(false);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 py-2" placeholder="Search emails..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input py-2 w-36" value={filterType} onChange={e => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="payslip">Payslip</option>
            <option value="announcement">Announcement</option>
            <option value="custom">General</option>
            <option value="leave">Leave</option>
            <option value="other">Other</option>
          </select>
          <select className="input py-2 w-32" value={filterStatus} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={checkSmtp} disabled={smtpChecking} className="btn-secondary flex items-center gap-1.5 text-sm">
            <HiOutlineWifi className="w-4 h-4" />{smtpChecking ? 'Checking...' : 'Test SMTP'}
          </button>
          <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
            <HiOutlineRefresh className="w-4 h-4" />Refresh
          </button>
          <button onClick={() => setCompose(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <HiOutlinePlus className="w-4 h-4" />Compose
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Emails', value: total, icon: HiOutlineMail, color: 'text-primary-600' },
          { label: 'Sent Today',   value: logs.filter(l => l.sent_at?.startsWith(new Date().toISOString().slice(0,10))).length, icon: HiOutlineCheckCircle, color: 'text-green-600' },
          { label: 'Payslips',     value: logs.filter(l => l.type === 'payslip').length, icon: HiOutlineMail, color: 'text-blue-600' },
          { label: 'Failed',       value: logs.filter(l => l.status === 'failed').length, icon: HiOutlineXCircle, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <s.icon className={`w-7 h-7 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <HiOutlineMail className="w-5 h-5 text-primary-600" />
            Email Logs ({total})
          </h3>
        </div>

        {loading ? <TableLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['To', 'Subject', 'Type', 'Status', 'Sent By', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No email logs found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.to_name || '—'}</p>
                      <p className="text-xs text-gray-500">{log.to_email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-700">{log.subject}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${TYPE_BADGE[log.type] || 'badge-gray'}`}>{log.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[log.status] || 'badge-gray'}`}>
                        {log.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.sent_by_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(log.sent_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openPreview(log.id)} className="btn-icon hover:bg-gray-100" title="Preview">
                        <HiOutlineEye className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages} · {total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary py-1 px-3 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-secondary py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Email Preview" size="xl"
        footer={<button onClick={() => setPreview(null)} className="btn-secondary">Close</button>}>
        {preview?.loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : preview && (
          <div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">To:</span> <span className="font-medium">{preview.to_name} &lt;{preview.to_email}&gt;</span></div>
              <div><span className="text-gray-500">Type:</span> <span className={`badge ${TYPE_BADGE[preview.type] || 'badge-gray'}`}>{preview.type}</span></div>
              <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{preview.subject}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`badge ${STATUS_BADGE[preview.status]}`}>{preview.status}</span></div>
              <div><span className="text-gray-500">Sent by:</span> {preview.sent_by_name || '—'}</div>
              <div><span className="text-gray-500">Date:</span> {formatDate(preview.sent_at)}</div>
              {preview.error_message && <div className="col-span-2 text-red-600 text-xs"><span className="text-gray-500">Error:</span> {preview.error_message}</div>}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: 480 }}>
              <iframe
                srcDoc={preview.body || '<p style="color:#aaa;padding:20px">No body content</p>'}
                title="Email preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Compose Modal */}
      <EmailCompose isOpen={compose} onClose={() => { setCompose(false); load(); }} />
    </div>
  );
}

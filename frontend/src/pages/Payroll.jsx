import { useState, useEffect, useCallback } from 'react';
import { payrollAPI, emailAPI } from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MONTHS } from '../utils/constants';
import { HiOutlinePlay, HiOutlineEye, HiOutlineCurrencyRupee, HiOutlineCheck, HiOutlineMail } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showRun, setShowRun] = useState(false);
  const [runForm, setRunForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [runLoading, setRunLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [runDetails, setRunDetails] = useState(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await payrollAPI.getRuns({ year });
      setRuns(data.data);
    } catch {}
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleRunPayroll = async () => {
    setRunLoading(true);
    try {
      const { data } = await payrollAPI.runPayroll(runForm);
      toast.success('Payroll processed successfully!');
      setShowRun(false);
      fetchRuns();
    } catch {}
    setRunLoading(false);
  };

  const loadDetails = async (run) => {
    setSelected(run);
    try {
      const { data } = await payrollAPI.getRunDetails(run.id);
      setRunDetails(data.data);
    } catch {}
  };

  const handleMarkPaid = async (id) => {
    try {
      await payrollAPI.markPaid(id);
      toast.success('Payroll marked as paid');
      fetchRuns();
      if (selected?.id === id) setSelected(p => ({ ...p, status: 'paid' }));
    } catch {}
  };

  const chartData = runs.map(r => ({
    month: MONTHS[r.month - 1]?.slice(0, 3),
    gross: r.total_gross, net: r.total_net, deductions: r.total_deductions
  }));

  return (
    <div className="space-y-4">
      {/* Chart + Summary */}
      {runs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Payroll Trend ({year})</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="gross" name="Gross" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="net" name="Net Pay" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payroll Runs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Payroll Runs</h3>
            <select value={year} onChange={e => setYear(+e.target.value)} className="px-2 py-1 text-sm border border-gray-200 rounded-lg">
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => setShowRun(true)} className="btn-primary btn-sm">
            <HiOutlinePlay className="w-4 h-4" /> Run Payroll
          </button>
        </div>

        {loading ? <TableLoader /> : runs.length === 0 ? <EmptyState title="No payroll runs found" message="Run payroll for a month to get started" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', 'Processed', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="px-4 py-3">{r.total_employees}</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{formatCurrency(r.total_gross)}</td>
                    <td className="px-4 py-3 text-red-600">{formatCurrency(r.total_deductions)}</td>
                    <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(r.total_net)}</td>
                    <td className="px-4 py-3"><Badge status={r.status} label={r.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{r.run_at ? formatDate(r.run_at) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => loadDetails(r)} className="btn-icon btn-secondary" title="View Details">
                          <HiOutlineEye className="w-4 h-4" />
                        </button>
                        {r.status === 'completed' && (
                          <button onClick={() => handleMarkPaid(r.id)} className="btn-icon bg-green-50 text-green-600 hover:bg-green-100 border border-green-200" title="Mark Paid">
                            <HiOutlineCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { emailAPI.sendPayslips(r.id); toast.success('Sending payslip emails...'); }} className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200" title="Send Payslip Emails">
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
      </div>

      {/* Run Payroll Modal */}
      <Modal isOpen={showRun} onClose={() => setShowRun(false)} title="Run Payroll" size="sm"
        footer={<><button onClick={() => setShowRun(false)} className="btn-secondary">Cancel</button><button onClick={handleRunPayroll} disabled={runLoading} className="btn-primary">{runLoading ? 'Processing...' : 'Run Payroll'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Month</label>
            <select className="input" value={runForm.month} onChange={e => setRunForm(f => ({ ...f, month: +e.target.value }))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input" value={runForm.year} onChange={e => setRunForm(f => ({ ...f, year: +e.target.value }))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            This will calculate salary for all active employees for {MONTHS[runForm.month - 1]} {runForm.year}.
          </div>
        </div>
      </Modal>

      {/* Payroll Details Modal */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setRunDetails(null); }} title={`Payroll — ${selected ? MONTHS[selected.month - 1] + ' ' + selected.year : ''}`} size="xl">
        {runDetails ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Employees', value: runDetails.run?.total_employees },
                { label: 'Gross Pay', value: formatCurrency(runDetails.run?.total_gross), color: 'text-blue-600' },
                { label: 'Deductions', value: formatCurrency(runDetails.run?.total_deductions), color: 'text-red-600' },
                { label: 'Net Pay', value: formatCurrency(runDetails.run?.total_net), color: 'text-green-600' }
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`font-bold text-lg mt-1 ${s.color || 'text-gray-800'}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {['Emp', 'Present', 'Basic', 'HRA', 'DA', 'Gross', 'PF', 'ESI', 'PT', 'Net', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runDetails.details?.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><p className="font-medium">{d.employee_name}</p><p className="text-gray-400">{d.employee_code}</p></td>
                      <td className="px-3 py-2">{d.present_days}d</td>
                      <td className="px-3 py-2">{formatCurrency(d.basic)}</td>
                      <td className="px-3 py-2">{formatCurrency(d.hra)}</td>
                      <td className="px-3 py-2">{formatCurrency(d.da)}</td>
                      <td className="px-3 py-2 font-medium text-blue-600">{formatCurrency(d.gross_salary)}</td>
                      <td className="px-3 py-2 text-red-600">{formatCurrency(d.pf_deduction)}</td>
                      <td className="px-3 py-2 text-red-600">{formatCurrency(d.esi_deduction)}</td>
                      <td className="px-3 py-2 text-red-600">{formatCurrency(d.professional_tax)}</td>
                      <td className="px-3 py-2 font-bold text-green-600">{formatCurrency(d.net_salary)}</td>
                      <td className="px-3 py-2"><Badge status={d.payment_status} label={d.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <TableLoader />}
      </Modal>
    </div>
  );
}

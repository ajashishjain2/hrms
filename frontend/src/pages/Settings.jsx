import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { TableLoader } from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/helpers';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';
import toast from 'react-hot-toast';

const TABS = ['Company', 'Departments', 'Designations', 'Shifts', 'Leave Types', 'Holidays', 'Payslip Template'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Company');
  const [company, setCompany] = useState({});
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [payslipConfig, setPayslipConfig] = useState(null);
  const [payslipSaving, setPayslipSaving] = useState(false);
  const [newEarning, setNewEarning] = useState({ label: '', amount: '' });
  const [newDeduction, setNewDeduction] = useState({ label: '', amount: '' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, d, des, s, lt, h, pc] = await Promise.all([
        settingsAPI.getCompany(), settingsAPI.getDepartments(), settingsAPI.getDesignations(),
        settingsAPI.getShifts(), settingsAPI.getLeaveTypes(),
        settingsAPI.getHolidays({ year: new Date().getFullYear() }),
        settingsAPI.getPayslipConfig(),
      ]);
      setCompany(c.data.data || {});
      setDepartments(d.data.data);
      setDesignations(des.data.data);
      setShifts(s.data.data);
      setLeaveTypes(lt.data.data);
      setHolidays(h.data.data);
      setPayslipConfig(pc.data.data);
    } catch {}
    setLoading(false);
  };

  const handlePayslipSave = async () => {
    setPayslipSaving(true);
    try {
      await settingsAPI.updatePayslipConfig(payslipConfig);
      toast.success('Payslip template saved');
    } catch {}
    setPayslipSaving(false);
  };

  const toggleComponent = (section, key) => {
    setPayslipConfig(cfg => ({
      ...cfg,
      [section]: cfg[section].map(c => c.key === key ? { ...c, active: !c.active } : c)
    }));
  };

  const updateLabel = (section, key, label) => {
    setPayslipConfig(cfg => ({
      ...cfg,
      [section]: cfg[section].map(c => c.key === key ? { ...c, label } : c)
    }));
  };

  const addCustom = (section) => {
    const src = section === 'earnings' ? newEarning : newDeduction;
    if (!src.label.trim()) return;
    const key = `custom_${section}`;
    const item = { id: Date.now().toString(), label: src.label.trim(), amount: parseFloat(src.amount) || 0, active: true };
    setPayslipConfig(cfg => ({ ...cfg, [key]: [...(cfg[key] || []), item] }));
    section === 'earnings' ? setNewEarning({ label: '', amount: '' }) : setNewDeduction({ label: '', amount: '' });
  };

  const removeCustom = (section, id) => {
    const key = `custom_${section}`;
    setPayslipConfig(cfg => ({ ...cfg, [key]: (cfg[key] || []).filter(c => c.id !== id) }));
  };

  const toggleCustom = (section, id) => {
    const key = `custom_${section}`;
    setPayslipConfig(cfg => ({ ...cfg, [key]: (cfg[key] || []).map(c => c.id === id ? { ...c, active: !c.active } : c) }));
  };

  const updateCustom = (section, id, field, value) => {
    const key = `custom_${section}`;
    setPayslipConfig(cfg => ({ ...cfg, [key]: (cfg[key] || []).map(c => c.id === id ? { ...c, [field]: value } : c) }));
  };

  useEffect(() => { loadAll(); }, []);

  const handleCompanySave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.target);
      await settingsAPI.updateCompany(fd);
      toast.success('Company settings saved');
      loadAll();
    } catch {}
    setSaving(false);
  };

  const handleCreateDept = async () => {
    try {
      await settingsAPI.createDepartment(form);
      toast.success('Department created');
      setModal(null);
      loadAll();
    } catch {}
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await settingsAPI.deleteDepartment(id);
      toast.success('Deleted');
      loadAll();
    } catch {}
  };

  const handleCreateShift = async () => {
    try {
      await settingsAPI.createShift(form);
      toast.success('Shift created');
      setModal(null);
      loadAll();
    } catch {}
  };

  const handleCreateHoliday = async () => {
    try {
      await settingsAPI.createHoliday(form);
      toast.success('Holiday added');
      setModal(null);
      loadAll();
    } catch {}
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await settingsAPI.deleteHoliday(id);
      toast.success('Deleted');
      loadAll();
    } catch {}
  };

  const handleCreateLeaveType = async () => {
    try {
      await settingsAPI.createLeaveType(form);
      toast.success('Leave type created');
      setModal(null);
      loadAll();
    } catch {}
  };

  const handleDeleteLeaveType = async (id) => {
    if (!confirm('Deactivate this leave type?')) return;
    try {
      await settingsAPI.deleteLeaveType(id);
      toast.success('Leave type deactivated');
      loadAll();
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 min-w-24 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === t ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Company Settings */}
      {activeTab === 'Company' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Company Information</h3>
          {loading ? <TableLoader /> : (
            <form onSubmit={handleCompanySave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Company Name</label><input name="company_name" className="input" defaultValue={company.company_name} /></div>
              <div><label className="label">Email</label><input name="company_email" type="email" className="input" defaultValue={company.company_email} /></div>
              <div><label className="label">Phone</label><input name="company_phone" className="input" defaultValue={company.company_phone} /></div>
              <div><label className="label">Currency</label>
                <select name="currency" className="input" defaultValue={company.currency || 'INR'}>
                  <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div><label className="label">Working Hours/Day</label><input name="working_hours" type="number" step="0.5" className="input" defaultValue={company.working_hours} /></div>
              <div><label className="label">Timezone</label>
                <select name="timezone" className="input" defaultValue={company.timezone || 'Asia/Kolkata'}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option><option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              <div className="md:col-span-2"><label className="label">Address</label><textarea name="company_address" className="input" rows={2} defaultValue={company.company_address} /></div>
              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Office Location (for GPS attendance validation)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="label">Office Latitude</label><input name="office_lat" type="number" step="any" className="input" placeholder="e.g. 28.6139" defaultValue={company.office_lat} /></div>
                  <div><label className="label">Office Longitude</label><input name="office_lng" type="number" step="any" className="input" placeholder="e.g. 77.2090" defaultValue={company.office_lng} /></div>
                  <div><label className="label">Allowed Radius (meters)</label><input name="office_radius" type="number" className="input" placeholder="300" defaultValue={company.office_radius || 300} /></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave blank to disable GPS validation. Get lat/lng from Google Maps.</p>
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Departments */}
      {activeTab === 'Departments' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Departments ({departments.length})</h3>
            <button onClick={() => { setForm({ name: '', description: '' }); setModal('dept'); }} className="btn-primary btn-sm"><HiOutlinePlus className="w-4 h-4" /> Add</button>
          </div>
          <div className="divide-y divide-gray-100">
            {departments.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.description} · {d.employee_count} employees</p>
                </div>
                <button onClick={() => handleDeleteDept(d.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Designations */}
      {activeTab === 'Designations' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Designations ({designations.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Title', 'Department', 'Level'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {designations.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-gray-600">{d.department_name}</td>
                    <td className="px-4 py-3"><span className="badge-blue badge">L{d.level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shifts */}
      {activeTab === 'Shifts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Shifts</h3>
            <button onClick={() => { setForm({ name: '', start_time: '09:00', end_time: '18:00', break_duration: 60 }); setModal('shift'); }} className="btn-primary btn-sm"><HiOutlinePlus className="w-4 h-4" /> Add</button>
          </div>
          <div className="divide-y divide-gray-100">
            {shifts.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.start_time} – {s.end_time} · Break: {s.break_duration} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Types */}
      {activeTab === 'Leave Types' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Leave Types ({leaveTypes.length})</h3>
            <button onClick={() => { setForm({ name: '', code: '', max_days_per_year: 12, is_paid: 1, carry_forward: 0 }); setModal('leaveType'); }} className="btn-primary btn-sm"><HiOutlinePlus className="w-4 h-4" /> Add</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Name', 'Code', 'Max Days/Year', 'Paid', 'Carry Forward', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {leaveTypes.filter(lt => lt.is_active !== 0).map(lt => (
                  <tr key={lt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{lt.name}</td>
                    <td className="px-4 py-3"><span className="badge badge-blue">{lt.code}</span></td>
                    <td className="px-4 py-3 text-gray-600">{lt.max_days_per_year} days</td>
                    <td className="px-4 py-3"><span className={`badge ${lt.is_paid ? 'badge-green' : 'badge-gray'}`}>{lt.is_paid ? 'Paid' : 'Unpaid'}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${lt.carry_forward ? 'badge-blue' : 'badge-gray'}`}>{lt.carry_forward ? 'Yes' : 'No'}</span></td>
                    <td className="px-4 py-3"><button onClick={() => handleDeleteLeaveType(lt.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Holidays */}
      {activeTab === 'Holidays' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Holidays {new Date().getFullYear()}</h3>
            <button onClick={() => { setForm({ name: '', date: '', type: 'national' }); setModal('holiday'); }} className="btn-primary btn-sm"><HiOutlinePlus className="w-4 h-4" /> Add</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                {['Holiday', 'Date', 'Type', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(h.date)}</td>
                    <td className="px-4 py-3"><span className={`badge ${h.type === 'national' ? 'badge-red' : h.type === 'optional' ? 'badge-blue' : 'badge-gray'}`}>{h.type}</span></td>
                    <td className="px-4 py-3"><button onClick={() => handleDeleteHoliday(h.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Template */}
      {activeTab === 'Payslip Template' && payslipConfig && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <h3 className="font-semibold text-green-800">Earnings Components</h3>
                <p className="text-xs text-green-600 mt-0.5">Toggle to show/hide. Rename labels as needed.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {payslipConfig.earnings.map(e => (
                  <div key={e.key} className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => toggleComponent('earnings', e.key)} className="flex-shrink-0" title={e.active ? 'Disable' : 'Enable'}>
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${e.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${e.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <input
                      className={`input flex-1 py-1.5 text-sm ${!e.active ? 'opacity-40' : ''}`}
                      value={e.label}
                      onChange={ev => updateLabel('earnings', e.key, ev.target.value)}
                    />
                    <span className="text-xs text-gray-400 font-mono w-28 flex-shrink-0">{e.key}</span>
                  </div>
                ))}
                {/* Custom earnings */}
                {(payslipConfig.custom_earnings || []).map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-2 bg-green-50/40">
                    <button onClick={() => toggleCustom('earnings', c.id)} className="flex-shrink-0">
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${c.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${c.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <input className="input flex-1 py-1.5 text-sm" value={c.label} onChange={ev => updateCustom('earnings', c.id, 'label', ev.target.value)} placeholder="Label" />
                    <input className="input w-28 py-1.5 text-sm" type="number" value={c.amount} onChange={ev => updateCustom('earnings', c.id, 'amount', parseFloat(ev.target.value) || 0)} placeholder="Amount" />
                    <button onClick={() => removeCustom('earnings', c.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"><HiOutlineTrash className="w-4 h-4" /></button>
                  </div>
                ))}
                {/* Add custom earning */}
                <div className="px-4 py-2 flex items-center gap-2 bg-gray-50">
                  <HiOutlinePlus className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <input className="input flex-1 py-1 text-sm" value={newEarning.label} onChange={e => setNewEarning(n => ({ ...n, label: e.target.value }))} placeholder="Custom earning label" onKeyDown={e => e.key === 'Enter' && addCustom('earnings')} />
                  <input className="input w-28 py-1 text-sm" type="number" value={newEarning.amount} onChange={e => setNewEarning(n => ({ ...n, amount: e.target.value }))} placeholder="Amount" />
                  <button onClick={() => addCustom('earnings')} className="btn-primary btn-sm flex-shrink-0">Add</button>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
                <h3 className="font-semibold text-red-800">Deduction Components</h3>
                <p className="text-xs text-red-600 mt-0.5">Toggle to show/hide. Rename labels as needed.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {payslipConfig.deductions.map(d => (
                  <div key={d.key} className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => toggleComponent('deductions', d.key)} className="flex-shrink-0" title={d.active ? 'Disable' : 'Enable'}>
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${d.active ? 'bg-red-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${d.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <input
                      className={`input flex-1 py-1.5 text-sm ${!d.active ? 'opacity-40' : ''}`}
                      value={d.label}
                      onChange={ev => updateLabel('deductions', d.key, ev.target.value)}
                    />
                    <span className="text-xs text-gray-400 font-mono w-28 flex-shrink-0">{d.key}</span>
                  </div>
                ))}
                {/* Custom deductions */}
                {(payslipConfig.custom_deductions || []).map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-2 bg-red-50/40">
                    <button onClick={() => toggleCustom('deductions', c.id)} className="flex-shrink-0">
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${c.active ? 'bg-red-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${c.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <input className="input flex-1 py-1.5 text-sm" value={c.label} onChange={ev => updateCustom('deductions', c.id, 'label', ev.target.value)} placeholder="Label" />
                    <input className="input w-28 py-1.5 text-sm" type="number" value={c.amount} onChange={ev => updateCustom('deductions', c.id, 'amount', parseFloat(ev.target.value) || 0)} placeholder="Amount" />
                    <button onClick={() => removeCustom('deductions', c.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"><HiOutlineTrash className="w-4 h-4" /></button>
                  </div>
                ))}
                {/* Add custom deduction */}
                <div className="px-4 py-2 flex items-center gap-2 bg-gray-50">
                  <HiOutlinePlus className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <input className="input flex-1 py-1 text-sm" value={newDeduction.label} onChange={e => setNewDeduction(n => ({ ...n, label: e.target.value }))} placeholder="Custom deduction label" onKeyDown={e => e.key === 'Enter' && addCustom('deductions')} />
                  <input className="input w-28 py-1 text-sm" type="number" value={newDeduction.amount} onChange={e => setNewDeduction(n => ({ ...n, amount: e.target.value }))} placeholder="Amount" />
                  <button onClick={() => addCustom('deductions')} className="btn-primary btn-sm flex-shrink-0">Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* Display toggles + footer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 mb-2">Display Options</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'show_attendance',   label: 'Attendance Summary' },
                { key: 'show_bank_details', label: 'Bank Details' },
                { key: 'show_pan',          label: 'PAN Number' },
                { key: 'show_pf_number',    label: 'PF Number' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600"
                    checked={!!payslipConfig[opt.key]}
                    onChange={e => setPayslipConfig(cfg => ({ ...cfg, [opt.key]: e.target.checked }))} />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="label mt-2">Footer / Disclaimer Text</label>
              <textarea className="input" rows={2}
                value={payslipConfig.footer_note || ''}
                onChange={e => setPayslipConfig(cfg => ({ ...cfg, footer_note: e.target.value }))} />
            </div>
            <button onClick={handlePayslipSave} disabled={payslipSaving} className="btn-primary">
              {payslipSaving ? 'Saving...' : 'Save Payslip Template'}
            </button>
          </div>
        </div>
      )}

      {/* Department Modal */}
      <Modal isOpen={modal === 'dept'} onClose={() => setModal(null)} title="Add Department" size="sm"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCreateDept} className="btn-primary">Create</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal isOpen={modal === 'shift'} onClose={() => setModal(null)} title="Add Shift" size="sm"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCreateShift} className="btn-primary">Create</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Time</label><input type="time" className="input" value={form.start_time || ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
            <div><label className="label">End Time</label><input type="time" className="input" value={form.end_time || ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
          </div>
          <div><label className="label">Break (minutes)</label><input type="number" className="input" value={form.break_duration || 60} onChange={e => setForm(f => ({ ...f, break_duration: +e.target.value }))} /></div>
        </div>
      </Modal>

      {/* Leave Type Modal */}
      <Modal isOpen={modal === 'leaveType'} onClose={() => setModal(null)} title="Add Leave Type" size="sm"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCreateLeaveType} className="btn-primary">Create</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Code *</label><input className="input" placeholder="e.g. CL, SL, EL" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
          <div><label className="label">Max Days / Year</label><input type="number" className="input" value={form.max_days_per_year || 12} onChange={e => setForm(f => ({ ...f, max_days_per_year: +e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Paid Leave</label>
              <select className="input" value={form.is_paid ?? 1} onChange={e => setForm(f => ({ ...f, is_paid: +e.target.value }))}>
                <option value={1}>Yes</option><option value={0}>No</option>
              </select>
            </div>
            <div><label className="label">Carry Forward</label>
              <select className="input" value={form.carry_forward ?? 0} onChange={e => setForm(f => ({ ...f, carry_forward: +e.target.value }))}>
                <option value={0}>No</option><option value={1}>Yes</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Holiday Modal */}
      <Modal isOpen={modal === 'holiday'} onClose={() => setModal(null)} title="Add Holiday" size="sm"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCreateHoliday} className="btn-primary">Add</button></>}>
        <div className="space-y-3">
          <div><label className="label">Holiday Name</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={form.type || 'national'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="national">National</option><option value="optional">Optional</option><option value="restricted">Restricted</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

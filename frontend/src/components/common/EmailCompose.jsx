import { useState, useEffect } from 'react';
import Modal from './Modal';
import { emailAPI, employeeAPI, settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineUsers } from 'react-icons/hi';

const TYPE_OPTIONS = [
  { value: 'custom',       label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'leave',        label: 'Leave Related' },
  { value: 'other',        label: 'Other' },
];

export default function EmailCompose({ isOpen, onClose, defaultEmployee = null, defaultSubject = '', defaultBody = '' }) {
  const [mode, setMode]               = useState('single'); // single | bulk | department
  const [employees, setEmployees]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm]               = useState({
    employee_id: defaultEmployee?.id || '',
    department_id: '',
    cc: '',
    subject: defaultSubject,
    body: defaultBody,
    type: 'custom',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    employeeAPI.getAll({ limit: 500 }).then(r => setEmployees(r.data.data || [])).catch(() => {});
    settingsAPI.getDepartments().then(r => setDepartments(r.data.data || [])).catch(() => {});
    setForm(f => ({ ...f, employee_id: defaultEmployee?.id || '', subject: defaultSubject, body: defaultBody }));
  }, [isOpen, defaultEmployee, defaultSubject, defaultBody]);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSend = async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    setSending(true);
    try {
      const payload = { subject: form.subject, body: form.body, type: form.type, cc: form.cc };
      if (mode === 'single') {
        if (!form.employee_id) { toast.error('Select an employee'); setSending(false); return; }
        await emailAPI.send({ ...payload, employee_id: form.employee_id });
        toast.success('Email sent successfully');
      } else if (mode === 'bulk') {
        await emailAPI.sendBulk({ ...payload, send_to_all: true });
        toast.success('Sending to all employees in background...');
      } else {
        if (!form.department_id) { toast.error('Select a department'); setSending(false); return; }
        await emailAPI.sendBulk({ ...payload, department_id: form.department_id });
        toast.success('Sending to department in background...');
      }
      setSending(false);
      onClose();
    } catch (err) {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Email" size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSend} disabled={sending} className="btn-primary">
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </>
      }>
      <div className="space-y-4">

        {/* Mode tabs */}
        <div className="flex gap-2">
          {[
            { id: 'single',     label: 'Single Employee' },
            { id: 'department', label: 'Department' },
            { id: 'bulk',       label: 'All Employees' },
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors
                ${mode === m.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Recipient */}
        {mode === 'single' && (
          <div>
            <label className="label">To (Employee)</label>
            <select className="input" value={form.employee_id} onChange={e => f('employee_id', e.target.value)}>
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} {emp.email ? `(${emp.email})` : '(no email)'}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === 'department' && (
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department_id} onChange={e => f('department_id', e.target.value)}>
              <option value="">-- Select Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.employee_count || 0} employees)</option>)}
            </select>
          </div>
        )}
        {mode === 'bulk' && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <HiOutlineUsers className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-700">This will send email to <strong>all active employees</strong> who have an email on record.</span>
          </div>
        )}

        {/* CC */}
        <div>
          <label className="label">CC</label>
          <input className="input" value={form.cc} onChange={e => f('cc', e.target.value)} placeholder="cc@example.com (optional)" />
        </div>

        {/* Type */}
        <div>
          <label className="label">Email Type</label>
          <select className="input" value={form.type} onChange={e => f('type', e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="label">Subject *</label>
          <input className="input" value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="Email subject..." />
        </div>

        {/* Body */}
        <div>
          <label className="label">Message *</label>
          <textarea className="input" rows={6} value={form.body} onChange={e => f('body', e.target.value)}
            placeholder="Write your message here..." />
          <p className="text-xs text-gray-400 mt-1">Company letterhead will be added automatically.</p>
        </div>

      </div>
    </Modal>
  );
}

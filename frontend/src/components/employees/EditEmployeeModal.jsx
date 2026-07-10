import { useState, useEffect } from 'react';
import { employeeAPI, settingsAPI } from '../../services/api';
import Modal from '../common/Modal';
import { EMPLOYMENT_TYPES } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function EditEmployeeModal({ employee, onClose, onSuccess }) {
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    date_of_birth: employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '',
    gender: employee.gender || '',
    blood_group: employee.blood_group || '',
    marital_status: employee.marital_status || '',
    address: employee.address || '',
    city: employee.city || '',
    state: employee.state || '',
    pincode: employee.pincode || '',
    department_id: employee.department_id || '',
    designation_id: employee.designation_id || '',
    shift_id: employee.shift_id || '',
    employment_type: employee.employment_type || 'full_time',
    date_of_joining: employee.date_of_joining ? employee.date_of_joining.split('T')[0] : '',
    basic_salary: employee.basic_salary || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
    pan_number: employee.pan_number || '',
    aadhaar_number: employee.aadhaar_number || '',
    bank_account_number: employee.bank_account_number || '',
    bank_name: employee.bank_name || '',
    bank_ifsc: employee.bank_ifsc || '',
    pf_number: employee.pf_number || '',
    esi_number: employee.esi_number || '',
    reporting_manager_id: employee.reporting_manager_id || ''
  });
  const [photo, setPhoto] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    Promise.all([
      settingsAPI.getDepartments(),
      settingsAPI.getShifts(),
      employeeAPI.getAll({ limit: 200 })
    ]).then(([deptRes, shiftRes, empRes]) => {
      setDepartments(deptRes.data.data);
      setShifts(shiftRes.data.data);
      setEmployees(empRes.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.department_id) {
      settingsAPI.getDesignations({ department_id: form.department_id })
        .then(({ data }) => setDesignations(data.data))
        .catch(() => {});
    }
  }, [form.department_id]);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name) {
      toast.error('First name and last name are required'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (photo) fd.append('photo', photo);
      await employeeAPI.update(employee.id, fd);
      toast.success('Employee updated successfully');
      onSuccess();
    } catch {}
    setLoading(false);
  };

  const inp = (key, label, type = 'text', opts = {}) => (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={form[key]} onChange={e => setField(key, e.target.value)} {...opts} />
    </div>
  );

  const sel = (key, label, options) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={form[key]} onChange={e => setField(key, e.target.value)}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o.value || o.id} value={o.value || o.id}>{o.label || o.name || o.title}</option>)}
      </select>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="Edit Employee" size="lg"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }>
      <div className="space-y-6">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
            {photo
              ? <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" />
              : employee.photo
                ? <img src={`/uploads/${employee.photo}`} alt={employee.first_name} className="w-full h-full object-cover" />
                : <span className="text-3xl text-gray-400">👤</span>
            }
          </div>
          <div>
            <label className="btn-secondary cursor-pointer text-xs">
              Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files[0])} />
            </label>
            {photo && <button onClick={() => setPhoto(null)} className="ml-2 text-xs text-red-500">Remove</button>}
          </div>
        </div>

        {/* Personal Info */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {inp('first_name', 'First Name *')}
            {inp('last_name', 'Last Name *')}
            {inp('email', 'Email', 'email')}
            {inp('phone', 'Phone')}
            {inp('date_of_birth', 'Date of Birth', 'date')}
            {sel('gender', 'Gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }])}
            {sel('blood_group', 'Blood Group', ['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(v => ({ value: v, label: v })))}
            {sel('marital_status', 'Marital Status', [
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married' },
              { value: 'divorced', label: 'Divorced' }
            ])}
          </div>
          <div className="mt-4">{inp('address', 'Address')}</div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {inp('city', 'City')}
            {inp('state', 'State')}
            {inp('pincode', 'Pincode')}
          </div>
        </div>

        {/* Employment Details */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Employment Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department_id} onChange={e => setField('department_id', e.target.value)}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {sel('designation_id', 'Designation', designations.map(d => ({ value: d.id, label: d.title })))}
            {sel('shift_id', 'Shift', shifts.map(s => ({ value: s.id, label: `${s.name} (${s.start_time}–${s.end_time})` })))}
            {sel('employment_type', 'Employment Type', EMPLOYMENT_TYPES)}
            {inp('date_of_joining', 'Date of Joining', 'date')}
            {inp('basic_salary', 'Basic Salary (₹)', 'number')}
            {sel('reporting_manager_id', 'Reporting Manager', employees
              .filter(e => e.id !== employee.id)
              .map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</h4>
          <div className="grid grid-cols-2 gap-4">
            {inp('emergency_contact_name', 'Emergency Contact Name')}
            {inp('emergency_contact_phone', 'Emergency Contact Phone')}
          </div>
        </div>

        {/* Bank & Documents */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bank & Documents</h4>
          <div className="grid grid-cols-2 gap-4">
            {inp('pan_number', 'PAN Number')}
            {inp('aadhaar_number', 'Aadhaar Number')}
            {inp('bank_account_number', 'Bank Account Number')}
            {inp('bank_name', 'Bank Name')}
            {inp('bank_ifsc', 'IFSC Code')}
            {inp('pf_number', 'PF Number')}
            {inp('esi_number', 'ESI Number')}
          </div>
        </div>
      </div>
    </Modal>
  );
}

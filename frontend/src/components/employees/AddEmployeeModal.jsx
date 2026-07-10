import { useState, useEffect } from 'react';
import { employeeAPI, settingsAPI } from '../../services/api';
import Modal from '../common/Modal';
import { EMPLOYMENT_TYPES } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function AddEmployeeModal({ onClose, onSuccess, departments }) {
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
    gender: '', blood_group: '', marital_status: '', address: '', city: '', state: '', pincode: '',
    department_id: '', designation_id: '', shift_id: '', employment_type: 'full_time',
    date_of_joining: new Date().toISOString().split('T')[0], basic_salary: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    pan_number: '', aadhaar_number: '', bank_account_number: '', bank_name: '', bank_ifsc: ''
  });
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    settingsAPI.getShifts().then(({ data }) => setShifts(data.data)).catch(() => {});
  }, []);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleDeptChange = async (deptId) => {
    setField('department_id', deptId);
    if (deptId) {
      try {
        const { data } = await settingsAPI.getDesignations({ department_id: deptId });
        setDesignations(data.data);
      } catch {}
    }
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Name and email are required'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (photo) fd.append('photo', photo);
      await employeeAPI.create(fd);
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
    <Modal isOpen onClose={onClose} title="Add New Employee" size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-primary-600' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="btn-secondary">Back</button>}
            {step < 3
              ? <button onClick={() => setStep(s => s + 1)} className="btn-primary">Next →</button>
              : <button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Employee'}</button>
            }
          </div>
        </div>
      }>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 mb-3">Personal Information</h4>

          {/* Photo upload */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
              {photo ? <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" /> : <span className="text-3xl text-gray-400">👤</span>}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer text-xs">
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={e => setPhoto(e.target.files[0])} />
              </label>
              {photo && <button onClick={() => setPhoto(null)} className="ml-2 text-xs text-red-500">Remove</button>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {inp('first_name', 'First Name *')}
            {inp('last_name', 'Last Name *')}
            {inp('email', 'Email *', 'email')}
            {inp('phone', 'Phone')}
            {inp('date_of_birth', 'Date of Birth', 'date')}
            {sel('gender', 'Gender', [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }])}
            {sel('blood_group', 'Blood Group', ['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(v => ({ value: v, label: v })))}
            {sel('marital_status', 'Marital Status', [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }])}
          </div>
          <div>{inp('address', 'Address')}</div>
          <div className="grid grid-cols-3 gap-4">
            {inp('city', 'City')}
            {inp('state', 'State')}
            {inp('pincode', 'Pincode')}
          </div>
        </div>
      )}

      {/* Step 2: Employment Details */}
      {step === 2 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 mb-3">Employment Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department_id} onChange={e => handleDeptChange(e.target.value)}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {sel('designation_id', 'Designation', designations.map(d => ({ value: d.id, label: d.title })))}
            {sel('shift_id', 'Shift', shifts.map(s => ({ value: s.id, label: `${s.name} (${s.start_time}–${s.end_time})` })))}
            {sel('employment_type', 'Employment Type', EMPLOYMENT_TYPES)}
            {inp('date_of_joining', 'Date of Joining *', 'date')}
            {inp('basic_salary', 'Basic Salary (₹)', 'number')}
            {inp('emergency_contact_name', 'Emergency Contact Name')}
            {inp('emergency_contact_phone', 'Emergency Contact Phone')}
          </div>
        </div>
      )}

      {/* Step 3: Documents & Bank */}
      {step === 3 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 mb-3">Documents & Bank Details</h4>
          <div className="grid grid-cols-2 gap-4">
            {inp('pan_number', 'PAN Number')}
            {inp('aadhaar_number', 'Aadhaar Number')}
            {inp('bank_account_number', 'Bank Account Number')}
            {inp('bank_name', 'Bank Name')}
            {inp('bank_ifsc', 'IFSC Code')}
            {inp('pf_number', 'PF Number')}
          </div>
        </div>
      )}
    </Modal>
  );
}

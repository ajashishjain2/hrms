import { useState, useEffect, useCallback } from 'react';
import { recruitmentAPI, settingsAPI } from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { TableLoader, EmptyState } from '../components/common/LoadingSpinner';
import { formatDate, formatCurrency } from '../utils/helpers';
import { APPLICANT_STAGES } from '../utils/constants';
import { HiOutlinePlus, HiOutlineEye, HiOutlineBriefcase, HiOutlineUsers } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Recruitment() {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobFilter, setJobFilter] = useState('active');
  const [jobForm, setJobForm] = useState({ title: '', department_id: '', description: '', requirements: '', location: '', employment_type: 'full_time', salary_min: '', salary_max: '', openings: 1, status: 'active', closing_date: '' });
  const [applicantFilter, setApplicantFilter] = useState({ job_id: '', status: '' });
  const [applicantForm, setApplicantForm] = useState({ job_posting_id: '', first_name: '', last_name: '', email: '', phone: '', experience_years: '', expected_salary: '' });

  useEffect(() => {
    settingsAPI.getDepartments().then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await recruitmentAPI.getJobs({ status: jobFilter || undefined });
      setJobs(data.data);
    } catch {}
    setLoading(false);
  }, [jobFilter]);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await recruitmentAPI.getApplicants(applicantFilter);
      setApplicants(data.data);
    } catch {}
    setLoading(false);
  }, [applicantFilter]);

  useEffect(() => { if (tab === 'jobs') fetchJobs(); else fetchApplicants(); }, [tab, fetchJobs, fetchApplicants]);

  const handleCreateJob = async () => {
    try {
      await recruitmentAPI.createJob(jobForm);
      toast.success('Job posted!');
      setShowJobModal(false);
      fetchJobs();
    } catch {}
  };

  const handleUpdateApplicantStatus = async (id, status) => {
    try {
      await recruitmentAPI.updateApplicantStatus(id, { status });
      toast.success('Status updated');
      fetchApplicants();
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-4">
          {[{ key: 'jobs', label: 'Job Postings', icon: HiOutlineBriefcase },
            { key: 'applicants', label: 'Applicants', icon: HiOutlineUsers }].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors
                ${tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <div className="ml-auto py-2">
            {tab === 'jobs' ? (
              <button onClick={() => setShowJobModal(true)} className="btn-primary btn-sm">
                <HiOutlinePlus className="w-4 h-4" /> Post Job
              </button>
            ) : (
              <button onClick={() => setShowApplicantModal(true)} className="btn-primary btn-sm">
                <HiOutlinePlus className="w-4 h-4" /> Add Applicant
              </button>
            )}
          </div>
        </div>

        {/* Jobs */}
        {tab === 'jobs' && (
          <div>
            <div className="px-4 py-3 border-b border-gray-50 flex gap-2">
              {['active', 'draft', 'closed', ''].map(s => (
                <button key={s} onClick={() => setJobFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors
                    ${jobFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {loading ? <TableLoader /> : jobs.length === 0 ? <EmptyState title="No job postings" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {jobs.map(job => (
                  <div key={job.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{job.title}</h4>
                        <p className="text-sm text-gray-500">{job.department_name} · {job.location}</p>
                      </div>
                      <Badge status={job.status} label={job.status} />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{job.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="badge-blue badge">{job.employment_type?.replace('_', ' ')}</span>
                        <span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                        {job.salary_min && <span>{formatCurrency(job.salary_min)}–{formatCurrency(job.salary_max)}</span>}
                      </div>
                      <span className="font-medium text-primary-600">{job.total_applicants} applicants</span>
                    </div>
                    {job.closing_date && <p className="text-xs text-red-500 mt-2">Closes: {formatDate(job.closing_date)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applicants */}
        {tab === 'applicants' && (
          <div>
            <div className="px-4 py-3 border-b border-gray-50 flex gap-2 flex-wrap">
              {[{ value: '', label: 'All' }, ...APPLICANT_STAGES].map(s => (
                <button key={s.value} onClick={() => setApplicantFilter(f => ({ ...f, status: s.value }))}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors
                    ${applicantFilter.status === s.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {loading ? <TableLoader /> : applicants.length === 0 ? <EmptyState title="No applicants" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Name', 'Job', 'Experience', 'Exp. Salary', 'Applied', 'Stage', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {applicants.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{a.first_name} {a.last_name}</p>
                          <p className="text-xs text-gray-400">{a.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.job_title}</td>
                        <td className="px-4 py-3 text-gray-600">{a.experience_years} yrs</td>
                        <td className="px-4 py-3 text-gray-600">{a.expected_salary ? formatCurrency(a.expected_salary) : '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(a.applied_at)}</td>
                        <td className="px-4 py-3">
                          <Badge status={a.status} label={APPLICANT_STAGES.find(s => s.value === a.status)?.label || a.status} color={APPLICANT_STAGES.find(s => s.value === a.status)?.color} />
                        </td>
                        <td className="px-4 py-3">
                          <select value={a.status} onChange={e => handleUpdateApplicantStatus(a.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500">
                            {APPLICANT_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <Modal isOpen={showJobModal} onClose={() => setShowJobModal(false)} title="Post New Job" size="md"
        footer={<><button onClick={() => setShowJobModal(false)} className="btn-secondary">Cancel</button><button onClick={handleCreateJob} className="btn-primary">Post Job</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Job Title *</label><input className="input" value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="label">Department</label>
            <select className="input" value={jobForm.department_id} onChange={e => setJobForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Location</label><input className="input" value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div><label className="label">Employment Type</label>
            <select className="input" value={jobForm.employment_type} onChange={e => setJobForm(f => ({ ...f, employment_type: e.target.value }))}>
              {['full_time','part_time','contract','intern'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Openings</label><input type="number" className="input" value={jobForm.openings} onChange={e => setJobForm(f => ({ ...f, openings: +e.target.value }))} /></div>
          <div><label className="label">Min Salary</label><input type="number" className="input" value={jobForm.salary_min} onChange={e => setJobForm(f => ({ ...f, salary_min: e.target.value }))} /></div>
          <div><label className="label">Max Salary</label><input type="number" className="input" value={jobForm.salary_max} onChange={e => setJobForm(f => ({ ...f, salary_max: e.target.value }))} /></div>
          <div><label className="label">Closing Date</label><input type="date" className="input" value={jobForm.closing_date} onChange={e => setJobForm(f => ({ ...f, closing_date: e.target.value }))} /></div>
          <div><label className="label">Status</label>
            <select className="input" value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option><option value="active">Active</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={3} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="col-span-2"><label className="label">Requirements</label><textarea className="input" rows={3} value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}

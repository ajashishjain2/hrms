import { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineBriefcase, HiOutlineLocationMarker, HiOutlineClock, HiOutlineCurrencyRupee, HiOutlineCalendar, HiOutlineMail } from 'react-icons/hi';

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/careers').then(r => {
      setJobs(r.data.data.jobs || []);
      setCompany(r.data.data.company || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-500 text-white py-12 px-6 text-center">
        <h1 className="text-3xl font-bold">{company.company_name || 'Careers'}</h1>
        <p className="text-primary-100 mt-2 text-lg">Join our team — open positions below</p>
        {company.company_address && <p className="text-primary-200 text-sm mt-1">{company.company_address}</p>}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <HiOutlineBriefcase className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">No open positions at this time.</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{jobs.length} open position{jobs.length !== 1 ? 's' : ''}</p>
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer p-5"
                onClick={() => setSelected(selected?.id === job.id ? null : job)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      {job.department_name && <span className="flex items-center gap-1"><HiOutlineBriefcase className="w-4 h-4" />{job.department_name}</span>}
                      {job.job_type && <span className="flex items-center gap-1"><HiOutlineClock className="w-4 h-4" />{job.job_type}</span>}
                      {job.experience_required && <span className="flex items-center gap-1"><HiOutlineCalendar className="w-4 h-4" />{job.experience_required} yrs exp</span>}
                      {(job.salary_min || job.salary_max) && (
                        <span className="flex items-center gap-1">
                          <HiOutlineCurrencyRupee className="w-4 h-4" />
                          {[fmt(job.salary_min), fmt(job.salary_max)].filter(Boolean).join(' – ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="badge badge-green text-xs">Open</span>
                    {job.last_date && <span className="text-xs text-gray-400">Apply by {new Date(job.last_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                  </div>
                </div>

                {selected?.id === job.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {job.description && (
                      <div className="prose prose-sm max-w-none text-gray-600 mb-4 whitespace-pre-wrap text-sm leading-relaxed">
                        {job.description}
                      </div>
                    )}
                    {company.company_email && (
                      <a href={`mailto:${company.company_email}?subject=Application for ${job.title}`}
                        className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
                        onClick={e => e.stopPropagation()}>
                        <HiOutlineMail className="w-4 h-4" />
                        Apply via Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center pb-8 text-xs text-gray-400">
        Powered by HR Management System
      </div>
    </div>
  );
}

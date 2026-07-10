import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const PAGE_TITLES = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your HR operations' },
  '/employees': { title: 'Employees', subtitle: 'Manage your workforce' },
  '/attendance': { title: 'Attendance', subtitle: 'Track daily attendance' },
  '/leaves': { title: 'Leave Management', subtitle: 'Manage leave requests' },
  '/payroll': { title: 'Payroll', subtitle: 'Process and manage salary' },
  '/reports': { title: 'Reports', subtitle: 'Analytics and insights' },
  '/recruitment': { title: 'Recruitment', subtitle: 'Manage job postings and applicants' },
  '/settings': { title: 'Settings', subtitle: 'System configuration' },
  '/emails':      { title: 'Email Logs',  subtitle: 'Sent emails and compose' },
  '/my-profile':  { title: 'My Profile',  subtitle: 'Your information on record' }
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { title, subtitle } = PAGE_TITLES[location.pathname] || { title: 'HR System', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

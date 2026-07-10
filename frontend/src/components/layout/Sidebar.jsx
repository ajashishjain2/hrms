import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome, HiOutlineUsers, HiOutlineClock, HiOutlineCalendar,
  HiOutlineCurrencyRupee, HiOutlineChartBar, HiOutlineBriefcase,
  HiOutlineCog, HiOutlineLogout, HiOutlineShieldCheck, HiOutlineMenu,
  HiOutlineMail, HiOutlineUser
} from 'react-icons/hi';
import { getInitials, getAvatarColor } from '../../utils/helpers';

const navItems = [
  { path: '/', icon: HiOutlineHome, label: 'Dashboard', roles: ['superadmin','admin','hr','employee'] },
  { path: '/employees', icon: HiOutlineUsers, label: 'Employees', roles: ['superadmin','admin','hr'] },
  { path: '/attendance', icon: HiOutlineClock, label: 'Attendance', roles: ['superadmin','admin','hr','employee'] },
  { path: '/leaves', icon: HiOutlineCalendar, label: 'Leaves', roles: ['superadmin','admin','hr','employee'] },
  { path: '/payroll', icon: HiOutlineCurrencyRupee, label: 'Payroll', roles: ['superadmin','admin','hr'] },
  { path: '/reports', icon: HiOutlineChartBar, label: 'Reports', roles: ['superadmin','admin','hr'] },
  { path: '/recruitment', icon: HiOutlineBriefcase, label: 'Recruitment', roles: ['superadmin','admin','hr'] },
  { path: '/my-profile', icon: HiOutlineUser,  label: 'My Profile', roles: ['employee'] },
  { path: '/emails',     icon: HiOutlineMail,  label: 'Email Logs', roles: ['superadmin','admin','hr'] },
  { path: '/settings',   icon: HiOutlineCog,   label: 'Settings',   roles: ['superadmin','admin'] }
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const allowed = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className={`h-full bg-slate-800 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <HiOutlineShieldCheck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-bold text-sm leading-tight">HR Management</h1>
            <p className="text-slate-400 text-xs">System v1.0</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto text-slate-400 hover:text-white transition-colors">
          <HiOutlineMenu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {allowed.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium
               ${isActive
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
               }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-slate-700 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(user?.first_name || user?.email)}`}>
            {user?.photo
              ? <img src={`/uploads/${user.photo}`} alt="avatar" className="w-full h-full rounded-full object-cover" />
              : getInitials(`${user?.first_name || ''} ${user?.last_name || user?.email || ''}`)
            }
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs font-medium truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </p>
              <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
            title="Logout"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import StatCard from '../components/common/StatCard';
import { TableLoader } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  HiOutlineUsers, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineCalendar, HiOutlineCurrencyRupee, HiOutlineBriefcase,
  HiOutlineUserAdd, HiOutlineClock
} from 'react-icons/hi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { attendanceAPI } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, todayRes] = await Promise.all([
          reportAPI.getDashboardStats(),
          attendanceAPI.getToday()
        ]);
        setStats(statsRes.data.data);
        setTodayData(todayRes.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const attendancePie = todayData?.stats ? [
    { name: 'Present', value: todayData.stats.present || 0 },
    { name: 'Absent', value: todayData.stats.absent || 0 },
    { name: 'Late', value: todayData.stats.late || 0 },
    { name: 'On Leave', value: todayData.stats.on_leave || 0 }
  ].filter(d => d.value > 0) : [];

  if (loading) return <TableLoader />;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats?.total_employees ?? 0} icon={HiOutlineUsers} color="blue" />
        <StatCard title="Present Today" value={stats?.present_today ?? 0} icon={HiOutlineCheckCircle} color="green" />
        <StatCard title="Absent Today" value={stats?.absent_today ?? 0} icon={HiOutlineXCircle} color="red" />
        <StatCard title="Pending Leaves" value={stats?.pending_leaves ?? 0} icon={HiOutlineCalendar} color="yellow" />
        <StatCard title="Monthly Payroll" value={formatCurrency(stats?.monthly_payroll)} icon={HiOutlineCurrencyRupee} color="purple" />
        <StatCard title="Open Positions" value={stats?.open_positions ?? 0} icon={HiOutlineBriefcase} color="indigo" />
        <StatCard title="New Joinings" value={stats?.new_joinings ?? 0} icon={HiOutlineUserAdd} color="green" subtitle="This month" />
        <StatCard title="New Applicants" value={stats?.new_applicants ?? 0} icon={HiOutlineClock} color="blue" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Today's Attendance</h3>
          {attendancePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {attendancePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No attendance data today
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Check-ins Today</h3>
          {todayData?.records?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Check In</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayData.records.slice(0, 8).map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5">
                        <div>
                          <p className="font-medium text-gray-800">{r.employee_name}</p>
                          <p className="text-xs text-gray-400">{r.employee_code}</p>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-600">{r.department_name || '-'}</td>
                      <td className="py-2.5 text-gray-600">
                        {r.check_in_time ? formatDate(r.check_in_time, 'hh:mm a') : '-'}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${r.status === 'present' ? 'bg-green-100 text-green-700' :
                            r.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No check-ins yet today</p>
          )}
        </div>
      </div>
    </div>
  );
}

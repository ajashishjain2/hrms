import { useState } from 'react';
import { HiOutlineBell, HiOutlineSearch, HiOutlineWifi } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatDate } from '../../utils/helpers';

export default function Header({ title, subtitle }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const today = new Date();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-gray-700">{formatDate(today, 'EEEE')}</p>
          <p className="text-xs text-gray-400">{formatDate(today, 'dd MMMM yyyy')}</p>
        </div>

        {/* Socket status */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className={`hidden sm:block ${connected ? 'text-green-600' : 'text-gray-400'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700">
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

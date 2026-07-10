import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '-';
  try { return format(typeof date === 'string' ? parseISO(date) : date, fmt); } catch { return '-'; }
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');

export const timeAgo = (date) => {
  if (!date) return '-';
  try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true }); } catch { return '-'; }
};

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
};

export const formatNumber = (num) => {
  if (!num) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const getInitials = (name) => {
  if (!name) return 'N/A';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

export const getAvatarColor = (str) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  if (!str) return colors[0];
  const i = str.charCodeAt(0) % colors.length;
  return colors[i];
};

export const getPhotoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `/uploads/${path}`;
};

export const calcWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = (new Date(checkOut) - new Date(checkIn)) / 3600000;
  return Math.max(0, parseFloat(diff.toFixed(2)));
};

export const getStatusColor = (status) => {
  const map = {
    present: 'green', absent: 'red', late: 'yellow', half_day: 'blue',
    on_leave: 'purple', holiday: 'gray', weekend: 'gray',
    pending: 'yellow', approved: 'green', rejected: 'red', cancelled: 'gray',
    active: 'green', inactive: 'red', terminated: 'red',
    draft: 'gray', processing: 'blue', completed: 'green', paid: 'green',
    applied: 'blue', screening: 'yellow', interview: 'purple',
    technical: 'indigo', hr_round: 'pink', offer: 'green', hired: 'green'
  };
  return map[status] || 'gray';
};

export const downloadCSV = (data, filename) => {
  if (!data?.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizes[size]} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export function TableLoader() {
  return (
    <div className="py-16 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export function EmptyState({ title = 'No data found', message = '', icon: Icon }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mb-4" />}
      <p className="text-gray-600 font-medium">{title}</p>
      {message && <p className="text-gray-400 text-sm mt-1">{message}</p>}
    </div>
  );
}

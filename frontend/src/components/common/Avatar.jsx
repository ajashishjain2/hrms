import { getInitials, getAvatarColor, getPhotoUrl } from '../../utils/helpers';

const SIZES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl'
};

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const photoUrl = getPhotoUrl(src);
  const sizeClass = SIZES[size] || SIZES.md;
  const bgColor = getAvatarColor(name);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${bgColor} ${className}`}>
      {getInitials(name)}
    </div>
  );
}

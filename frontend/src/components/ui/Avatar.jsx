import React from 'react';
import { getUserColor, getInitials } from '../../utils/helpers';

/**
 * Avatar component — shows user photo or generated initials
 * @param {string}  src       - Image URL
 * @param {string}  username  - Used for initials + color
 * @param {boolean} isOnline  - Show green online dot
 * @param {string}  size      - Tailwind size class suffix (default 'md')
 */
const sizeMap = {
  xs:  { box: 'w-7 h-7',   text: 'text-xs' },
  sm:  { box: 'w-8 h-8',   text: 'text-xs' },
  md:  { box: 'w-10 h-10', text: 'text-sm' },
  lg:  { box: 'w-12 h-12', text: 'text-base' },
  xl:  { box: 'w-16 h-16', text: 'text-xl' },
};

const Avatar = ({ src, username = '?', isOnline = false, size = 'md' }) => {
  const { box, text } = sizeMap[size] || sizeMap.md;
  const color    = getUserColor(username);
  const initials = getInitials(username);

  return (
    <div className={`relative flex-shrink-0 ${box}`}>
      {src ? (
        <img
          src={src}
          alt={username}
          className={`${box} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${box} rounded-full flex items-center justify-center font-semibold ${text} select-none`}
          style={{ backgroundColor: color + '22', color }}
        >
          {initials}
        </div>
      )}

      {isOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary-400 rounded-full ring-2 ring-surface-100" />
      )}
    </div>
  );
};

export default Avatar;

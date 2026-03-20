import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

/**
 * Format a message timestamp
 */
export const formatMessageTime = (date) => {
  return format(new Date(date), 'HH:mm');
};

/**
 * Format conversation list date (Today / Yesterday / date)
 */
export const formatConversationDate = (date) => {
  const d = new Date(date);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
};

/**
 * Format last seen timestamp
 */
export const formatLastSeen = (date) => {
  if (!date) return 'a while ago';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Generate a color from a username (consistent per user)
 */
export const getUserColor = (username = '') => {
  const colors = [
    '#4ade80', '#60a5fa', '#f472b6', '#fb923c',
    '#a78bfa', '#34d399', '#f87171', '#facc15',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get initials from a username
 */
export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Truncate text to a given length
 */
export const truncate = (text = '', maxLen = 40) => {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};

/**
 * Format file size in human-readable form
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

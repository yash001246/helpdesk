export const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const CATEGORIES = ['technical', 'billing', 'account', 'feature_request', 'general', 'other'];

export const label = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
export const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

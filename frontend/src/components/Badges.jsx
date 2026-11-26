import { label } from '../format';

export const StatusBadge = ({ status }) => <span className={`badge status-${status}`}>{label(status)}</span>;
export const PriorityTag = ({ priority }) => <span className={`prio prio-${priority}`}>{label(priority)}</span>;

'use client';

import { LEAD_STATUSES } from '@/lib/constants';
import type { LeadStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: LeadStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = LEAD_STATUSES.find(s => s.value === status);
  const label = statusConfig?.label || status;
  const color = statusConfig?.color || '#94a3b8';
  const bg = statusConfig?.bg || '#f1f5f9';

  return (
    <span
      className="status-badge"
      style={{
        color,
        background: bg,
        fontSize: size === 'sm' ? 11 : 12,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
      }}
    >
      {label}
    </span>
  );
}

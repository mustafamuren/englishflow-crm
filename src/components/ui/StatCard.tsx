'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  accentClass?: string;
}

export default function StatCard({ title, value, change, changeType = 'neutral', icon, accentClass = 'stat-card-blue' }: StatCardProps) {
  const changeColor = changeType === 'positive' ? '#10b981' : changeType === 'negative' ? '#ef4444' : '#94a3b8';

  return (
    <div className={`card ${accentClass}`} style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>{title}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value}
          </p>
          {change && (
            <p style={{ fontSize: 12, color: changeColor, marginTop: 8, fontWeight: 500 }}>
              {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'} {change}
            </p>
          )}
        </div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

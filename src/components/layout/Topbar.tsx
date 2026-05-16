'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Menu, Bell, Search } from 'lucide-react';
import { useState } from 'react';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header
      style={{
        height: 64,
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="lg:hidden"
          onClick={onMenuClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Menu size={22} />
        </button>

        {title && (
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>{title}</h2>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 12px',
            minWidth: 200,
          }}
          className="hidden md:flex"
        >
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: 13,
              color: '#334155',
              width: '100%',
            }}
          />
        </div>

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Bell size={20} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid white',
            }}
          />
        </button>

        {/* User info */}
        <div className="hidden sm:block" style={{ marginLeft: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', lineHeight: 1.2 }}>
            {profile?.full_name || 'Kullanıcı'}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
            {profile?.role === 'sales_rep' ? 'Satış Temsilcisi' : profile?.role === 'admin' ? 'Yönetici' : profile?.role || 'Kullanıcı'}
          </p>
        </div>
      </div>
    </header>
  );
}

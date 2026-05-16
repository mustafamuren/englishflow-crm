'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, user } = useAuth();

  // Show a minimal loading screen while auth is initializing
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            animation: 'pulse-soft 1.5s infinite',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>English Flow Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not logged in, middleware will redirect — but just in case
  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main
        className="main-content"
        style={{
          flex: 1,
          marginLeft: 260,
          minHeight: '100vh',
          background: '#f8fafc',
        }}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

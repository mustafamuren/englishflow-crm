'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  GraduationCap,
  BookOpen,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  X,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/contacts', label: 'Kişiler', icon: Users },
  { href: '/contacts/new', label: 'Kişi Ekle', icon: UserPlus },
  { href: '/appointments', label: 'Randevular', icon: Calendar },
  { href: '/sales', label: 'Satışlar', icon: DollarSign },
  { href: '/trainers', label: 'Eğitmenler', icon: GraduationCap },
  { href: '/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="overlay lg:hidden" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Zap size={20} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}>English Flow</h1>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>CRM</span>
              </div>
            </Link>
            <button
              className="lg:hidden"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          <div style={{ padding: '0 20px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              MENÜ
            </span>
          </div>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '16px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              flexShrink: 0,
            }}>
              {profile ? getInitials(profile.full_name) : '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Yükleniyor...'}
              </p>
              <p style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>
                {profile?.role === 'sales_rep' ? 'Satış Temsilcisi' : profile?.role === 'admin' ? 'Yönetici' : profile?.role || '...'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="sidebar-link"
            style={{ margin: 0, width: '100%', color: '#ef4444' }}
          >
            <LogOut size={18} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
}

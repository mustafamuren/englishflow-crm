'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Settings, Users, BookOpen, Tag, Layers, Plus, Trash2, Edit } from 'lucide-react';

type SettingsTab = 'courses' | 'sources' | 'staff' | 'profile';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('courses');
  const [courses, setCourses] = useState<Array<{ id: string; name: string; description: string; price: number; is_active: boolean }>>([]);
  const [sources, setSources] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseForm, setCourseForm] = useState({ name: '', description: '', price: 0 });
  const [sourceForm, setSourceForm] = useState({ name: '' });
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const [c, s, st] = await Promise.all([
      supabase.from('courses').select('*').order('name'),
      supabase.from('lead_sources').select('*').order('name'),
      supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
    ]);
    setCourses(c.data || []);
    setSources(s.data || []);
    setStaff(st.data || []);
    if (profile) setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '' });
    setIsLoading(false);
  }, [supabase, profile]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('courses').insert({ ...courseForm, is_active: true });
    toast.success('Kurs eklendi');
    setCourseForm({ name: '', description: '', price: 0 });
    setShowCourseForm(false);
    fetchSettings();
  };

  const handleDeleteCourse = async (id: string) => {
    await supabase.from('courses').delete().eq('id', id);
    toast.success('Silindi');
    fetchSettings();
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('lead_sources').insert({ name: sourceForm.name, is_active: true });
    toast.success('Kaynak eklendi');
    setSourceForm({ name: '' });
    setShowSourceForm(false);
    fetchSettings();
  };

  const handleDeleteSource = async (id: string) => {
    await supabase.from('lead_sources').delete().eq('id', id);
    toast.success('Silindi');
    fetchSettings();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('profiles').update(profileForm).eq('id', profile?.id);
    toast.success('Profil güncellendi');
    refreshProfile();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    toast.success('Rol güncellendi');
    fetchSettings();
  };

  const tabs = [
    { key: 'courses' as const, label: 'Kurslar', icon: BookOpen },
    { key: 'sources' as const, label: 'Aday Kaynakları', icon: Layers },
    { key: 'staff' as const, label: 'Personel', icon: Users },
    { key: 'profile' as const, label: 'Profilim', icon: Settings },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><LoadingSpinner size={40} /></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Ayarlar</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>CRM yapılandırmanızı yönetin</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Sidebar tabs */}
        <div className="card" style={{ padding: 12, height: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: activeTab === tab.key ? '#2563eb' : '#64748b', background: activeTab === tab.key ? '#eff6ff' : 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left' }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ padding: 28 }}>
          {activeTab === 'courses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Kurslar</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCourseForm(!showCourseForm)}><Plus size={16} /> Kurs Ekle</button>
              </div>
              {showCourseForm && (
                <form onSubmit={handleAddCourse} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><label className="form-label">Ad</label><input type="text" value={courseForm.name} onChange={(e) => setCourseForm(p => ({ ...p, name: e.target.value }))} required className="form-input" /></div>
                  <div style={{ flex: 1 }}><label className="form-label">Açıklama</label><input type="text" value={courseForm.description} onChange={(e) => setCourseForm(p => ({ ...p, description: e.target.value }))} className="form-input" /></div>
                  <div style={{ width: 120 }}><label className="form-label">Fiyat (₺)</label><input type="number" value={courseForm.price} onChange={(e) => setCourseForm(p => ({ ...p, price: parseFloat(e.target.value) }))} className="form-input" /></div>
                  <button type="submit" className="btn btn-primary btn-sm">Ekle</button>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {courses.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</p>
                      {c.description && <p style={{ fontSize: 12, color: '#64748b' }}>{c.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {c.price > 0 && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>{c.price}₺</span>}
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteCourse(c.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Henüz kurs yok</p>}
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Aday Kaynakları</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSourceForm(!showSourceForm)}><Plus size={16} /> Kaynak Ekle</button>
              </div>
              {showSourceForm && (
                <form onSubmit={handleAddSource} style={{ padding: 16, background: '#f8fafc', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><label className="form-label">Ad</label><input type="text" value={sourceForm.name} onChange={(e) => setSourceForm({ name: e.target.value })} required className="form-input" placeholder="Örn: Instagram, Google Ads" /></div>
                  <button type="submit" className="btn btn-primary btn-sm">Ekle</button>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sources.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteSource(s.id)}><Trash2 size={15} /></button>
                  </div>
                ))}
                {sources.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Henüz aday kaynağı yok</p>}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Personel Yönetimi</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{s.full_name}</p>
                      <p style={{ fontSize: 12, color: '#64748b' }}>{s.email}</p>
                    </div>
                    <select value={s.role} onChange={(e) => handleRoleChange(s.id, e.target.value)} className="form-input" style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}>
                      <option value="admin">Yönetici</option>
                      <option value="sales_rep">Satış Temsilcisi</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Profilim</h2>
              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 500 }}>
                  <div><label className="form-label">Ad Soyad</label><input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))} className="form-input" /></div>
                  <div><label className="form-label">Telefon</label><input type="text" value={profileForm.phone} onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="form-input" /></div>
                  <div><label className="form-label">E-posta</label><input type="email" value={profile?.email || ''} disabled className="form-input" style={{ background: '#f8fafc', color: '#94a3b8' }} /></div>
                  <div><label className="form-label">Rol</label><input type="text" value={profile?.role === 'sales_rep' ? 'Satış Temsilcisi' : 'Yönetici'} disabled className="form-input" style={{ background: '#f8fafc', color: '#94a3b8', textTransform: 'capitalize' }} /></div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>Profili Güncelle</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { APPOINTMENT_STATUSES } from '@/lib/constants';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { Calendar, Plus, Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle, CalendarDays } from 'lucide-react';
import type { Appointment } from '@/lib/types';

const PAGE_SIZE = 15;

export default function AppointmentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // New date filter
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string }>>([]);
  const [form, setForm] = useState({ contact_id: '', title: 'Tanışma Toplantısı', date: '', time: '', duration_minutes: 30, location: 'Ofis', notes: '' });

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from('appointments').select('*, contacts(full_name, phone)', { count: 'exact' });
    
    if (statusFilter) query = query.eq('status', statusFilter);
    if (dateFilter) query = query.eq('date', dateFilter); // Filter by date
    if (search) query = query.ilike('title', `%${search}%`);
    
    const from = (currentPage - 1) * PAGE_SIZE;
    const { data, count } = await query.order('date', { ascending: true }).order('time', { ascending: true }).range(from, from + PAGE_SIZE - 1);
    
    setAppointments((data || []).map((a: any) => ({ ...a, contact: a.contacts })) as Appointment[]);
    setTotalCount(count || 0);
    setIsLoading(false);
  }, [supabase, statusFilter, dateFilter, search, currentPage]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => { supabase.from('contacts').select('id, full_name').order('full_name').then(({ data }) => setContacts(data || [])); }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('appointments').insert({ ...form, user_id: user?.id, status: 'scheduled' });
    if (error) { toast.error('Hata oluştu'); return; }
    
    await supabase.from('contacts').update({ status: 'appointment_scheduled' }).eq('id', form.contact_id);
    await supabase.from('contact_activities').insert({ contact_id: form.contact_id, user_id: user?.id, type: 'appointment', description: `Randevu oluşturuldu: ${form.title}` });
    
    toast.success('Randevu başarıyla oluşturuldu');
    setShowForm(false);
    setForm({ contact_id: '', title: 'Tanışma Toplantısı', date: '', time: '', duration_minutes: 30, location: 'Ofis', notes: '' });
    fetchAppointments();
  };

  const handleStatusUpdate = async (id: string, status: string, contactId: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    const statusText = status === 'completed' ? 'Tamamlandı' : status === 'missed' ? 'Gelinmedi' : 'İptal Edildi';
    await supabase.from('contact_activities').insert({ contact_id: contactId, user_id: user?.id, type: 'appointment', description: `Randevu durumu güncellendi: ${statusText}` });
    toast.success('Güncellendi');
    fetchAppointments();
  };

  const getStatusLabel = (status: string) => {
    const s = APPOINTMENT_STATUSES.find(x => x.value === status);
    if (status === 'scheduled') return 'Bekliyor';
    if (status === 'completed') return 'Tamamlandı';
    if (status === 'missed') return 'Gelinmedi';
    if (status === 'cancelled') return 'İptal';
    return s?.label || status;
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={16} color="#22c55e" />;
    if (status === 'missed') return <XCircle size={16} color="#ef4444" />;
    if (status === 'cancelled') return <AlertTriangle size={16} color="#94a3b8" />;
    return <Clock size={16} color="#3b82f6" />;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Randevular</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{totalCount} toplam randevu</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Yeni Randevu
        </button>
      </div>

      {showForm && (
        <div className="card animate-scale-in" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Hızlı Randevu Kaydı</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Kişi Seç *</label>
                <select value={form.contact_id} onChange={(e) => setForm(p => ({ ...p, contact_id: e.target.value }))} required className="form-input">
                  <option value="">Seçiniz...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Başlık *</label><input type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required className="form-input" /></div>
              <div><label className="form-label">Konum</label><input type="text" value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} className="form-input" placeholder="Ofis / Online" /></div>
              <div><label className="form-label">Tarih *</label><input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} required className="form-input" /></div>
              <div><label className="form-label">Saat *</label><input type="time" value={form.time} onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))} required className="form-input" /></div>
              <div><label className="form-label">Süre (Dakika)</label><input type="number" value={form.duration_minutes} onChange={(e) => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))} className="form-input" /></div>
              <div style={{ gridColumn: 'span 3' }}><label className="form-label">Notlar</label><textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="form-input" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>İptal</button>
              <button type="submit" className="btn btn-primary btn-sm">Randevuyu Kaydet</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '0 12px', border: '1px solid #e2e8f0' }}>
            <Search size={16} color="#94a3b8" />
            <input type="text" placeholder="Randevu ara..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, padding: '10px 0', width: '100%' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px' }}>
            <CalendarDays size={16} color="#94a3b8" />
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }} 
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#334155', padding: '8px 0' }}
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>&times;</button>
            )}
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="form-input" style={{ width: 'auto', minWidth: 160, fontSize: 13, padding: '8px 12px' }}>
            <option value="">Tüm Durumlar</option>
            <option value="scheduled">Bekliyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="missed">Gelinmedi</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div> : appointments.length === 0 ? (
          <EmptyState icon={<Calendar size={48} color="#cbd5e1" />} title="Randevu bulunamadı" description="Seçili kriterlere uygun randevu yok veya henüz hiç randevu oluşturulmamış." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Kişi</th><th>Başlık</th><th>Tarih</th><th>Saat</th><th>Konum</th><th>Durum</th><th style={{ textAlign: 'right' }}>Aksiyonlar</th></tr></thead>
              <tbody>
                {appointments.map(apt => (
                  <tr key={apt.id}>
                    <td><Link href={`/contacts/${apt.contact_id}`} style={{ color: '#1e293b', fontWeight: 500, textDecoration: 'none' }}>{(apt as any).contact?.full_name || 'Bilinmiyor'}</Link></td>
                    <td>{apt.title}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{formatDate(apt.date)}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{apt.time}</td>
                    <td style={{ color: '#64748b' }}>{apt.location || '—'}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{statusIcon(apt.status)} <span style={{ fontSize: 13 }}>{getStatusLabel(apt.status)}</span></span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {apt.status === 'scheduled' && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#22c55e', fontSize: 12 }} onClick={() => handleStatusUpdate(apt.id, 'completed', apt.contact_id)}>Tamamla</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: 12 }} onClick={() => handleStatusUpdate(apt.id, 'missed', apt.contact_id)}>Gelinmedi</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(totalCount / PAGE_SIZE)} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}

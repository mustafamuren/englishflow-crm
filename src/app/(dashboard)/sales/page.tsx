'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PAYMENT_METHODS } from '@/lib/constants';
import StatCard from '@/components/ui/StatCard';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { DollarSign, Plus, TrendingUp, CreditCard, BarChart3, Download, Trash2 } from 'lucide-react';
import type { Sale } from '@/lib/types';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 15;

export default function SalesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [form, setForm] = useState({ contact_id: '', course_id: '', amount: 0, payment_method: 'cash', notes: '', trainer_id: '' });
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, avgSale: 0, monthlySales: 0 });

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    const from = (currentPage - 1) * PAGE_SIZE;
    const { data, count } = await supabase.from('sales').select('*, contacts(full_name, phone), courses(name), profiles(full_name), trainers(full_name)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setSales((data || []).map((s: Record<string, unknown>) => ({ ...s, contact: s.contacts, course: s.courses, user: s.profiles, trainer: s.trainers })) as Sale[]);
    setTotalCount(count || 0);
    setIsLoading(false);
  }, [supabase, currentPage]);

  const fetchStats = useCallback(async () => {
    const { data: allSales } = await supabase.from('sales').select('amount, created_at');
    if (allSales) {
      const total = allSales.reduce((s, v) => s + (v.amount || 0), 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthly = allSales.filter(s => new Date(s.created_at) >= monthStart).reduce((s, v) => s + (v.amount || 0), 0);
      setStats({ totalSales: allSales.length, totalRevenue: total, avgSale: allSales.length ? total / allSales.length : 0, monthlySales: monthly });
    }
  }, [supabase]);

  useEffect(() => { fetchSales(); fetchStats(); }, [fetchSales, fetchStats]);
  useEffect(() => {
    Promise.all([
      supabase.from('contacts').select('id, full_name, phone').order('full_name'),
      supabase.from('courses').select('id, name, price').eq('is_active', true),
      supabase.from('trainers').select('id, full_name').eq('is_active', true),
    ]).then(([c, co, t]) => { setContacts(c.data || []); setCourses(co.data || []); setTrainers(t.data || []); });
  }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('sales').insert({ ...form, user_id: user?.id });
    if (error) { toast.error('Hata oluştu'); return; }
    await supabase.from('contacts').update({ status: 'sale_completed' }).eq('id', form.contact_id);
    await supabase.from('contact_activities').insert({ contact_id: form.contact_id, user_id: user?.id, type: 'sale', description: `Satış tamamlandı: ${formatCurrency(form.amount)}` });
    toast.success('Satış kaydedildi');
    setShowForm(false);
    setForm({ contact_id: '', course_id: '', amount: 0, payment_method: 'cash', notes: '', trainer_id: '' });
    fetchSales();
    fetchStats();
  };

  const handleExport = () => {
    if (!sales.length) { toast.error('Veri bulunamadı'); return; }
    const ws = XLSX.utils.json_to_sheet(sales.map(s => ({ 
      Tarih: formatDate(s.created_at), 
      Müşteri: (s.contact as any)?.full_name || '', 
      Kurs: (s.course as any)?.name || (s.notes?.startsWith('30 Saat') || s.notes?.startsWith('60 Saat') ? s.notes.split(' - ')[0] : ''), 
      Tutar: s.amount, 
      Ödeme: s.payment_method, 
      Temsilci: (s.user as any)?.full_name || '' 
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, `satis_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Dışa aktarıldı');
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Satışı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) { toast.error('Silinemedi'); return; }
    toast.success('Satış silindi');
    fetchSales();
    fetchStats();
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Satışlar</h1><p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{totalCount} toplam satış</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={16} /> Dışa Aktar</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Yeni Satış</button>
        </div>
      </div>

      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Toplam Satış" value={stats.totalSales} icon={<DollarSign size={22} />} accentClass="stat-card-blue" />
        <StatCard title="Toplam Gelir" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp size={22} />} accentClass="stat-card-green" />
        <StatCard title="Ortalama Satış" value={formatCurrency(stats.avgSale)} icon={<BarChart3 size={22} />} accentClass="stat-card-purple" />
        <StatCard title="Aylık Gelir" value={formatCurrency(stats.monthlySales)} icon={<CreditCard size={22} />} accentClass="stat-card-amber" />
      </div>

      {showForm && (
        <div className="card animate-scale-in" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Yeni Satış Kaydet</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div><label className="form-label">Müşteri *</label><select value={form.contact_id} onChange={(e) => setForm(p => ({ ...p, contact_id: e.target.value }))} required className="form-input"><option value="">Seçiniz</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
              <div><label className="form-label">Kurs</label><select value={form.course_id} onChange={(e) => { setForm(p => ({ ...p, course_id: e.target.value })); const c = courses.find(c => c.id === e.target.value); if (c?.price) setForm(p => ({ ...p, amount: c.price })); }} className="form-input">
                <option value="">Seçiniz</option>
                {courses.length === 0 && (
                  <>
                    <option value="30_hours">30 Saat Özel Ders</option>
                    <option value="60_hours">60 Saat Özel Ders</option>
                  </>
                )}
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
              <div><label className="form-label">Tutar (₺) *</label><input type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: parseFloat(e.target.value) }))} required min={0} className="form-input" /></div>
              <div><label className="form-label">Ödeme Yöntemi *</label><select value={form.payment_method} onChange={(e) => setForm(p => ({ ...p, payment_method: e.target.value }))} className="form-input">{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
              <div><label className="form-label">Eğitmen</label><select value={form.trainer_id} onChange={(e) => setForm(p => ({ ...p, trainer_id: e.target.value }))} className="form-input"><option value="">Seçiniz</option>{trainers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">Notlar</label><input type="text" value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="form-input" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>İptal</button>
              <button type="submit" className="btn btn-primary btn-sm">Satışı Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div> : sales.length === 0 ? (
          <EmptyState icon={<DollarSign size={48} color="#cbd5e1" />} title="Henüz satış yok" description="İlk satışınızı kaydedin." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Tarih</th><th>Müşteri</th><th>Kurs</th><th>Ödeme</th><th>Tutar</th><th>Temsilci</th><th>İşlem</th></tr></thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{formatDate(sale.created_at)}</td>
                    <td><Link href={`/contacts/${sale.contact_id}`} style={{ color: '#1e293b', fontWeight: 500, textDecoration: 'none' }}>{(sale.contact as any)?.full_name || '—'}</Link></td>
                    <td>
                      {(sale.course as any)?.name || (sale.notes?.startsWith('30 Saat') || sale.notes?.startsWith('60 Saat') ? sale.notes.split(' - ')[0] : '—')}
                    </td>
                    <td style={{ fontSize: 13 }}>{PAYMENT_METHODS.find(m => m.value === sale.payment_method)?.label || sale.payment_method}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(sale.amount)}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{(sale.user as any)?.full_name || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteSale(sale.id)} title="Satışı İptal Et">
                        <Trash2 size={14} />
                      </button>
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

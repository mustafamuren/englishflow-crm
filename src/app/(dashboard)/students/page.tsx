'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { STUDENT_LEVELS } from '@/lib/constants';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, BookOpen, Search, Edit, Trash2, GraduationCap } from 'lucide-react';
import type { Student } from '@/lib/types';

const PAGE_SIZE = 15;

export default function StudentsPage() {
  const supabase = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', trainer_id: '', course_id: '', package_name: '', total_lessons: 0, level: '', speaking_club_access: false, zoom_link: '', start_date: '', end_date: '', notes: '' });

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from('students').select('*, trainers(full_name), courses(name)', { count: 'exact' });
    if (search) query = query.ilike('full_name', `%${search}%`);
    const from = (currentPage - 1) * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setStudents((data || []).map((s: Record<string, unknown>) => ({ ...s, trainer: s.trainers, course: s.courses })) as Student[]);
    setTotalCount(count || 0);
    setIsLoading(false);
  }, [supabase, search, currentPage]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => {
    supabase.from('trainers').select('id, full_name').eq('is_active', true).then(({ data }) => setTrainers(data || []));
    supabase.from('courses').select('id, name').eq('is_active', true).then(({ data }) => setCourses(data || []));
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, remaining_lessons: form.total_lessons, completed_lessons: 0, is_active: true };
    if (editId) {
      await supabase.from('students').update(form).eq('id', editId);
      toast.success('Öğrenci güncellendi');
    } else {
      await supabase.from('students').insert(payload);
      toast.success('Öğrenci eklendi');
    }
    resetForm();
    fetchStudents();
  };

  const handleEdit = (s: Student) => {
    setEditId(s.id);
    setForm({ full_name: s.full_name, phone: s.phone || '', email: s.email || '', trainer_id: s.trainer_id || '', course_id: s.course_id || '', package_name: s.package_name || '', total_lessons: s.total_lessons, level: s.level || '', speaking_club_access: s.speaking_club_access, zoom_link: s.zoom_link || '', start_date: s.start_date || '', end_date: s.end_date || '', notes: s.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('students').delete().eq('id', deleteId);
    toast.success('Öğrenci silindi');
    setDeleteId(null);
    fetchStudents();
  };

  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ full_name: '', phone: '', email: '', trainer_id: '', course_id: '', package_name: '', total_lessons: 0, level: '', speaking_club_access: false, zoom_link: '', start_date: '', end_date: '', notes: '' }); };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Öğrenciler</h1><p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{totalCount} öğrenci</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}><Plus size={16} /> Öğrenci Ekle</button>
      </div>

      {showForm && (
        <div className="card animate-scale-in" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{editId ? 'Düzenle' : 'Yeni'} Öğrenci</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div><label className="form-label">Ad Soyad *</label><input type="text" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required className="form-input" /></div>
              <div><label className="form-label">Telefon</label><input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">E-posta</label><input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Eğitmen</label><select value={form.trainer_id} onChange={(e) => setForm(p => ({ ...p, trainer_id: e.target.value }))} className="form-input"><option value="">Seçiniz</option>{trainers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">Kurs</label><select value={form.course_id} onChange={(e) => setForm(p => ({ ...p, course_id: e.target.value }))} className="form-input"><option value="">Seçiniz</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="form-label">Paket Adı</label><input type="text" value={form.package_name} onChange={(e) => setForm(p => ({ ...p, package_name: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Toplam Ders</label><input type="number" value={form.total_lessons} onChange={(e) => setForm(p => ({ ...p, total_lessons: parseInt(e.target.value) }))} className="form-input" /></div>
              <div><label className="form-label">Seviye</label><select value={form.level} onChange={(e) => setForm(p => ({ ...p, level: e.target.value }))} className="form-input"><option value="">Seçiniz</option>{STUDENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
              <div><label className="form-label">Zoom Bağlantısı</label><input type="url" value={form.zoom_link} onChange={(e) => setForm(p => ({ ...p, zoom_link: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Başlangıç Tarihi</label><input type="date" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Bitiş Tarihi</label><input type="date" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} className="form-input" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}><input type="checkbox" checked={form.speaking_club_access} onChange={(e) => setForm(p => ({ ...p, speaking_club_access: e.target.checked }))} id="speaking" /><label htmlFor="speaking" style={{ fontSize: 13 }}>Speaking Club Erişimi</label></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>İptal</button>
              <button type="submit" className="btn btn-primary btn-sm">{editId ? 'Güncelle' : 'Ekle'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '0 12px', border: '1px solid #e2e8f0' }}>
          <Search size={16} color="#94a3b8" />
          <input type="text" placeholder="Öğrenci ara..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, padding: '10px 0', width: '100%' }} />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div> : students.length === 0 ? (
          <EmptyState icon={<BookOpen size={48} color="#cbd5e1" />} title="Öğrenci bulunamadı" description="İlk öğrencinizi ekleyin." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Ad Soyad</th><th>Eğitmen</th><th>Kurs</th><th>Seviye</th><th>Dersler</th><th>Durum</th><th style={{ textAlign: 'right' }}>İşlemler</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{(s.trainer as unknown as Record<string, string>)?.full_name || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{(s.course as unknown as Record<string, string>)?.name || '—'}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 4, background: '#f5f3ff', fontSize: 11, color: '#8b5cf6' }}>{s.level || '—'}</span></td>
                    <td style={{ fontSize: 13 }}>{s.completed_lessons}/{s.total_lessons} <span style={{ color: '#94a3b8' }}>({s.remaining_lessons} kaldı)</span></td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 4, background: s.is_active ? '#f0fdf4' : '#fef2f2', fontSize: 11, color: s.is_active ? '#22c55e' : '#ef4444' }}>{s.is_active ? 'Aktif' : 'Pasif'}</span></td>
                    <td><div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(s)}><Edit size={15} /></button><button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => setDeleteId(s.id)}><Trash2 size={15} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(totalCount / PAGE_SIZE)} onPageChange={setCurrentPage} />
      </div>
      <ConfirmDialog isOpen={!!deleteId} title="Öğrenciyi Sil" message="Emin misiniz?" confirmLabel="Sil" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} icon={<Trash2 size={24} />} />
    </div>
  );
}

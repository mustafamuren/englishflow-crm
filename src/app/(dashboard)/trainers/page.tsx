'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, GraduationCap, Edit, Trash2, Globe, Mail, Phone, DollarSign, Users } from 'lucide-react';
import type { Trainer } from '@/lib/types';

export default function TrainersPage() {
  const supabase = createClient();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [trainerStudents, setTrainerStudents] = useState<Record<string, any[]>>({});
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [assignToTrainer, setAssignToTrainer] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    nationality: '',
    languages: '',
    expertise: '',
    hourly_rate: 0,
    zoom_link: '',
    bio: ''
  });

  const fetchTrainers = useCallback(async () => {
    setIsLoading(true);
    
    // Auto-sync: Create student records for all completed sales that don't have one
    const { data: soldContacts } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, interested_course')
      .eq('status', 'sale_completed');
    
    const { data: existingStudents } = await supabase
      .from('students')
      .select('contact_id');
    
    const existingContactIds = new Set(existingStudents?.map(s => s.contact_id) || []);
    const missingStudents = soldContacts?.filter(c => !existingContactIds.has(c.id)) || [];
    
    if (missingStudents.length > 0) {
      await Promise.all(missingStudents.map(c => 
        supabase.from('students').insert({
          contact_id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
          package_name: c.interested_course || 'Eski Satış',
          is_active: true
        })
      ));
    }

    const [trainersRes, studentsRes] = await Promise.all([
      supabase.from('trainers').select('*').order('full_name'),
      supabase.from('students').select('id, full_name, trainer_id, package_name, total_lessons, notes').eq('is_active', true)
    ]);
    
    const studentMap: Record<string, any[]> = {};
    studentsRes.data?.forEach(s => {
      if (s.trainer_id) {
        if (!studentMap[s.trainer_id]) studentMap[s.trainer_id] = [];
        studentMap[s.trainer_id].push(s);
      }
    });
    
    setTrainers(trainersRes.data || []);
    setAllStudents(studentsRes.data || []);
    setTrainerStudents(studentMap);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const handleAssignStudent = async () => {
    if (!assignToTrainer || !selectedStudent) return;
    const { error } = await supabase.from('students').update({ trainer_id: assignToTrainer }).eq('id', selectedStudent);
    if (error) { toast.error('Atama yapılamadı'); return; }
    toast.success('Öğrenci atandı');
    setAssignToTrainer(null);
    setSelectedStudent('');
    fetchTrainers();
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Öğrenciyi bu eğitmenden çıkartmak istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('students').update({ trainer_id: null }).eq('id', studentId);
    if (error) { toast.error('İşlem başarısız'); return; }
    toast.success('Öğrenci çıkartıldı');
    fetchTrainers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, languages: form.languages.split(',').map(l => l.trim()).filter(Boolean), expertise: form.expertise.split(',').map(e => e.trim()).filter(Boolean), is_active: true };
    if (editId) {
      await supabase.from('trainers').update(payload).eq('id', editId);
      toast.success('Eğitmen güncellendi');
    } else {
      await supabase.from('trainers').insert(payload);
      toast.success('Eğitmen eklendi');
    }
    resetForm();
    fetchTrainers();
  };

  const handleEdit = (t: Trainer) => {
    setEditId(t.id);
    setForm({ full_name: t.full_name, email: t.email || '', phone: t.phone || '', nationality: t.nationality || '', languages: (t.languages || []).join(', '), expertise: (t.expertise || []).join(', '), hourly_rate: t.hourly_rate || 0, zoom_link: t.zoom_link || '', bio: t.bio || '' });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('trainers').delete().eq('id', deleteId);
    toast.success('Eğitmen silindi');
    setDeleteId(null);
    fetchTrainers();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ full_name: '', email: '', phone: '', nationality: '', languages: '', expertise: '', hourly_rate: 0, zoom_link: '', bio: '' });
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Eğitmenler</h1><p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{trainers.length} eğitmen</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}><Plus size={16} /> Eğitmen Ekle</button>
      </div>

      {showForm && (
        <div className="card animate-scale-in" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{editId ? 'Düzenle' : 'Yeni'} Eğitmen</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div><label className="form-label">Ad Soyad *</label><input type="text" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required className="form-input" /></div>
              <div><label className="form-label">E-posta</label><input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Telefon</label><input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Uyruk</label><input type="text" value={form.nationality} onChange={(e) => setForm(p => ({ ...p, nationality: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Diller (virgülle ayırın)</label><input type="text" value={form.languages} onChange={(e) => setForm(p => ({ ...p, languages: e.target.value }))} className="form-input" placeholder="İngilizce, Türkçe" /></div>
              <div><label className="form-label">Uzmanlık (virgülle ayırın)</label><input type="text" value={form.expertise} onChange={(e) => setForm(p => ({ ...p, expertise: e.target.value }))} className="form-input" placeholder="IELTS, İş İngilizcesi" /></div>
              <div><label className="form-label">Saatlik Ücret (₺)</label><input type="number" value={form.hourly_rate} onChange={(e) => setForm(p => ({ ...p, hourly_rate: parseFloat(e.target.value) }))} className="form-input" /></div>
              <div><label className="form-label">Zoom Bağlantısı</label><input type="url" value={form.zoom_link} onChange={(e) => setForm(p => ({ ...p, zoom_link: e.target.value }))} className="form-input" /></div>
              <div><label className="form-label">Biyografi</label><input type="text" value={form.bio} onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} className="form-input" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>İptal</button>
              <button type="submit" className="btn btn-primary btn-sm">{editId ? 'Güncelle' : 'Ekle'} Eğitmen</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div> : trainers.length === 0 ? (
        <div className="card"><EmptyState icon={<GraduationCap size={48} color="#cbd5e1" />} title="Eğitmen bulunamadı" description="İlk eğitmeninizi ekleyin." /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {trainers.map(t => (
            <div key={t.id} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                    {t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{t.full_name}</h3>
                    {t.nationality && <p style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} /> {t.nationality}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(t)}><Edit size={15} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => setDeleteId(t.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                {t.languages && t.languages.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>{t.languages.map(l => <span key={l} style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', fontSize: 11, color: '#64748b' }}>{l}</span>)}</div>}
                {t.expertise && t.expertise.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>{t.expertise.map(e => <span key={e} style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', fontSize: 11, color: '#3b82f6' }}>{e}</span>)}</div>}
                
                <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> Öğrenciler ({trainerStudents[t.id]?.length || 0})
                    </h4>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => setAssignToTrainer(t.id)}>+ Öğrenci Ata</button>
                  </div>
                  {trainerStudents[t.id] && trainerStudents[t.id].length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {trainerStudents[t.id].map(s => (
                        <div key={s.id} style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontWeight: 600, color: '#334155' }}>{s.full_name}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <p style={{ fontSize: 10, color: '#94a3b8' }}>{s.package_name || 'Paket yok'} {s.total_lessons ? `(${s.total_lessons} Saat)` : ''}</p>
                              {s.notes && <p style={{ fontSize: 10, color: '#3b82f6', fontWeight: 500 }}>{s.notes}</p>}
                            </div>
                          </div>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#94a3b8', height: 24, width: 24 }} onClick={() => handleRemoveStudent(s.id)} title="Eğitmenden Çıkart">
                            <Plus size={14} style={{ transform: 'rotate(45deg)', color: '#ef4444' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Öğrenci atanmamış</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                {t.hourly_rate ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> {t.hourly_rate}₺/sa</span> : null}
                {t.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {t.email}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {assignToTrainer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Öğrenci Ata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label className="form-label">Öğrenci Seçin</label>
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="form-input">
                  <option value="">Seçiniz</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} {s.trainer_id ? '(Zaten atalı)' : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Ders Günleri</label>
                  <input 
                    type="text" 
                    placeholder="Pzt, Çar, Cum" 
                    className="form-input"
                    id="lesson_days"
                  />
                </div>
                <div>
                  <label className="form-label">Ders Saatleri</label>
                  <input 
                    type="text" 
                    placeholder="14:00, 19:00" 
                    className="form-input"
                    id="lesson_hours"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setAssignToTrainer(null)}>İptal</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                const days = (document.getElementById('lesson_days') as HTMLInputElement).value;
                const hours = (document.getElementById('lesson_hours') as HTMLInputElement).value;
                const schedule = `${days} | ${hours}`;
                
                const { error } = await supabase.from('students').update({ 
                  trainer_id: assignToTrainer,
                  notes: schedule
                }).eq('id', selectedStudent);
                
                if (error) { toast.error('Atama yapılamadı'); return; }
                toast.success('Öğrenci atandı ve program kaydedildi');
                setAssignToTrainer(null);
                setSelectedStudent('');
                fetchTrainers();
              }} disabled={!selectedStudent}>Atamayı Tamamla</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Eğitmeni Sil" message="Emin misiniz?" confirmLabel="Sil" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} icon={<Trash2 size={24} />} />
    </div>
  );
}

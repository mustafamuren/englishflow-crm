'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate, formatPhone, getWhatsAppUrl, getCallUrl, getRelativeTime } from '@/lib/utils';
import { LEAD_STATUSES } from '@/lib/constants';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { 
  ArrowLeft, Phone, MessageCircle, Mail, Edit, FileText, 
  Calendar as CalendarIcon, Send, Activity, Bell, CreditCard, Plus 
} from 'lucide-react';
import type { Contact, ContactNote, ContactActivity, FollowUp, Appointment } from '@/lib/types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, color: '#334155' }}>{value}</p>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const { user } = useAuth();
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Forms state
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'activities' | 'appointments' | 'followups'>('notes');
  
  const [showAptForm, setShowAptForm] = useState(false);
  const [aptForm, setAptForm] = useState({ title: 'Tanışma Toplantısı', date: '', time: '', notes: '' });
  
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleForm, setSaleForm] = useState({ amount: '', course_id: '', payment_method: 'cash', notes: '' });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [contactRes, notesRes, actRes, fuRes, aptRes, coursesRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', contactId).single(),
      supabase.from('contact_notes').select('*, profiles(full_name)').eq('contact_id', contactId).order('created_at', { ascending: false }),
      supabase.from('contact_activities').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(30),
      supabase.from('follow_ups').select('*').eq('contact_id', contactId).order('due_date', { ascending: true }),
      supabase.from('appointments').select('*').eq('contact_id', contactId).order('date', { ascending: false }),
      supabase.from('courses').select('*').eq('is_active', true)
    ]);
    
    setContact(contactRes.data);
    setNotes((notesRes.data || []).map((n: any) => ({ ...n, user: n.profiles })) as ContactNote[]);
    setActivities(actRes.data || []);
    setFollowUps(fuRes.data || []);
    setAppointments(aptRes.data || []);
    setCourses(coursesRes.data || []);
    setIsLoading(false);
  }, [supabase, contactId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await supabase.from('contact_notes').insert({ contact_id: contactId, user_id: user?.id, content: newNote });
      await supabase.from('contact_activities').insert({ contact_id: contactId, user_id: user?.id, type: 'note_added', description: 'Not eklendi' });
      setNewNote('');
      toast.success('Not eklendi');
      fetchAll();
    } catch { toast.error('Not eklenemedi'); }
    finally { setAddingNote(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!contact) return;
    const old = contact.status;
    await supabase.from('contacts').update({ status: newStatus }).eq('id', contactId);
    await supabase.from('contact_activities').insert({ contact_id: contactId, user_id: user?.id, type: 'status_change', description: `Durum "${old}" değerinden "${newStatus}" değerine güncellendi` });
    toast.success('Durum güncellendi');
    fetchAll();
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('appointments').insert({
        contact_id: contactId,
        user_id: user?.id,
        title: aptForm.title,
        date: aptForm.date,
        time: aptForm.time,
        notes: aptForm.notes,
        status: 'scheduled'
      });
      if (error) throw error;
      
      await supabase.from('contact_activities').insert({
        contact_id: contactId,
        user_id: user?.id,
        type: 'appointment',
        description: `Yeni randevu oluşturuldu: ${aptForm.title} (${aptForm.date})`
      });
      
      setShowAptForm(false);
      setAptForm({ title: 'Tanışma Toplantısı', date: '', time: '', notes: '' });
      toast.success('Randevu oluşturuldu');
      fetchAll();
    } catch { toast.error('Randevu oluşturulamadı'); }
  };

  const handleMakeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First update the contact info if it was changed in the modal
      await supabase.from('contacts').update({
        full_name: contact.full_name,
        email: contact.email
      }).eq('id', contactId);

      const isHardcodedCourse = ['30_hours', '60_hours'].includes(saleForm.course_id);
      const courseName = saleForm.course_id === '30_hours' ? '30 Saat Özel Ders' : 
                         saleForm.course_id === '60_hours' ? '60 Saat Özel Ders' : 
                         courses.find(c => c.id === saleForm.course_id)?.name;

      const { error } = await supabase.from('sales').insert({
        contact_id: contactId,
        user_id: user?.id,
        course_id: isHardcodedCourse ? null : saleForm.course_id,
        amount: parseFloat(saleForm.amount),
        payment_method: saleForm.payment_method,
        notes: isHardcodedCourse ? `${courseName}${saleForm.notes ? ' - ' + saleForm.notes : ''}` : saleForm.notes
      });
      if (error) throw error;

      // Create student record
      const totalLessons = saleForm.course_id === '30_hours' ? 30 : 
                           saleForm.course_id === '60_hours' ? 60 : 0;
      
      await supabase.from('students').insert({
        contact_id: contactId,
        full_name: contact.full_name,
        email: contact.email,
        phone: contact.phone,
        package_name: courseName,
        total_lessons: totalLessons,
        remaining_lessons: totalLessons,
        is_active: true
      });

      // Update contact status to sale completed
      await supabase.from('contacts').update({ status: 'sale_completed' }).eq('id', contactId);
      
      await supabase.from('contact_activities').insert({
        contact_id: contactId,
        user_id: user?.id,
        type: 'sale',
        description: `Satış yapıldı: ${courseName} - ₺${saleForm.amount}`
      });

      setShowSaleForm(false);
      toast.success('Satış başarıyla kaydedildi!');
      fetchAll();
    } catch (error) {
      console.error(error);
      toast.error('Satış kaydedilemedi'); 
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><LoadingSpinner size={40} /></div>;
  if (!contact) return <div style={{ textAlign: 'center', padding: 80 }}><h2 style={{ color: '#64748b' }}>Kişi bulunamadı</h2><Link href="/contacts" className="btn btn-primary" style={{ marginTop: 16 }}>Geri Dön</Link></div>;

  const tabs = [
    { key: 'notes' as const, label: 'Notlar', icon: FileText, count: notes.length },
    { key: 'activities' as const, label: 'Zaman Tüneli', icon: Activity, count: activities.length },
    { key: 'appointments' as const, label: 'Randevular', icon: CalendarIcon, count: appointments.length },
    { key: 'followups' as const, label: 'Takip Notları', icon: Bell, count: followUps.length },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href="/contacts" className="btn btn-ghost btn-icon"><ArrowLeft size={20} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{contact.full_name}</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Kayıt Tarihi: {formatDate(contact.created_at)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSaleForm(true)} className="btn btn-success btn-sm"><CreditCard size={16} /> Satış Yap</button>
          <Link href={`/contacts/${contactId}/edit`} className="btn btn-secondary btn-sm"><Edit size={16} /> Düzenle</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 700, color: 'white' }}>
                {contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{contact.full_name}</h2>
              <div style={{ marginTop: 8 }}><StatusBadge status={contact.status} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <a href={getCallUrl(contact.phone)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Phone size={15} /> Ara</a>
              <a href={getWhatsAppUrl(contact.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ flex: 1, background: '#25D366', color: 'white', border: 'none' }}><MessageCircle size={15} /> WhatsApp</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DetailRow label="Telefon" value={formatPhone(contact.phone)} />
              <DetailRow label="E-posta" value={contact.email || '—'} />
              <DetailRow label="İlgilendiği Eğitim" value={contact.interested_course || '—'} />
              <DetailRow label="Kaynak" value={contact.lead_source || '—'} />
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Durum Güncelle</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LEAD_STATUSES.map(s => (
                <button key={s.value} onClick={() => handleStatusChange(s.value)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: contact.status === s.value ? `2px solid ${s.color}` : '1px solid #e2e8f0', background: contact.status === s.value ? s.bg : 'white', color: contact.status === s.value ? s.color : '#64748b', cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontWeight: 500, color: activeTab === tab.key ? '#2563eb' : '#64748b', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}>
                <tab.icon size={15} /> {tab.label}
                {tab.count > 0 && <span style={{ background: activeTab === tab.key ? '#eff6ff' : '#f1f5f9', color: activeTab === tab.key ? '#2563eb' : '#94a3b8', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            {activeTab === 'notes' && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Not yazın..." rows={3} className="form-input" style={{ resize: 'vertical', flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} style={{ alignSelf: 'flex-end' }}><Send size={14} /> Gönder</button>
                </div>
                {notes.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>Henüz not yok.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notes.map(note => (
                      <div key={note.id} style={{ padding: 14, borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{(note as any).user?.full_name || 'Kullanıcı'} • {getRelativeTime(note.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === 'activities' && (
              activities.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>Aktivite yok.</p> : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: '#e2e8f0' }} />
                  {activities.map(act => (
                    <div key={act.id} style={{ position: 'relative', marginBottom: 18 }}>
                      <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', border: '2px solid white' }} />
                      <p style={{ fontSize: 13, color: '#334155' }}>{act.description}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{getRelativeTime(act.created_at)}</p>
                    </div>
                  ))}
                </div>
              )
            )}
            {activeTab === 'appointments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {appointments.map(apt => (
                  <div key={apt.id} style={{ padding: 14, borderRadius: 8, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{apt.title}</p>
                      <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{apt.status}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{formatDate(apt.date)} • {apt.time}</p>
                  </div>
                ))}
                {appointments.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>Henüz randevu yok.</p>}
              </div>
            )}
            {activeTab === 'followups' && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>Takip notları burada listelenir.</p>
            )}
          </div>

          {/* Quick Appointment Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Yeni Randevu Oluştur</h3>
              {!showAptForm && <button onClick={() => setShowAptForm(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Randevu Ekle</button>}
            </div>

            {showAptForm ? (
              <form onSubmit={handleAddAppointment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Başlık</label>
                  <input type="text" value={aptForm.title} onChange={e => setAptForm(p => ({ ...p, title: e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Tarih</label>
                  <input type="date" value={aptForm.date} onChange={e => setAptForm(p => ({ ...p, date: e.target.value }))} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Saat</label>
                  <input type="time" value={aptForm.time} onChange={e => setAptForm(p => ({ ...p, time: e.target.value }))} className="form-input" required />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Notlar</label>
                  <textarea value={aptForm.notes} onChange={e => setAptForm(p => ({ ...p, notes: e.target.value }))} className="form-input" rows={2} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setShowAptForm(false)} className="btn btn-secondary btn-sm">İptal</button>
                  <button type="submit" className="btn btn-primary btn-sm">Randevuyu Kaydet</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
                <CalendarIcon size={32} color="#94a3b8" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: '#64748b' }}>Hızlıca bir tanışma veya deneme dersi randevusu oluşturun.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Modal */}
      {showSaleForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: 450, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Satış Yap</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>{contact.full_name} için yeni satış kaydı oluşturun.</p>
            
            <form onSubmit={handleMakeSale} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">İsim Soyisim</label>
                <input 
                  type="text" 
                  value={contact.full_name} 
                  onChange={e => setContact(p => p ? ({ ...p, full_name: e.target.value }) : null)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">E-posta</label>
                <input 
                  type="email" 
                  value={contact.email || ''} 
                  onChange={e => setContact(p => p ? ({ ...p, email: e.target.value }) : null)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">Eğitim Paketi *</label>
                <select value={saleForm.course_id} onChange={e => setSaleForm(p => ({ ...p, course_id: e.target.value }))} className="form-input" required>
                  <option value="">Seçiniz</option>
                  {courses.length === 0 && (
                    <>
                      <option value="30_hours">30 Saat Özel Ders</option>
                      <option value="60_hours">60 Saat Özel Ders</option>
                    </>
                  )}
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} (₺{c.price})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Satış Fiyatı (₺) *</label>
                <input type="number" value={saleForm.amount} onChange={e => setSaleForm(p => ({ ...p, amount: e.target.value }))} className="form-input" required placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Ödeme Yöntemi</label>
                <select value={saleForm.payment_method} onChange={e => setSaleForm(p => ({ ...p, payment_method: e.target.value }))} className="form-input">
                  <option value="cash">Nakit</option>
                  <option value="bank_transfer">Banka Havalesi</option>
                  <option value="credit_card">Kredi Kartı</option>
                  <option value="installment">Taksit</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowSaleForm(false)} className="btn btn-secondary">İptal</button>
                <button type="submit" className="btn btn-success">Satışı Tamamla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

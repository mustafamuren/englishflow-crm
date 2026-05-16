'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { LEAD_STATUSES } from '@/lib/constants';
import { isValidTurkishPhone } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string }>>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', interested_course: '', status: 'waiting', lead_source: '', assigned_staff_id: '', notes: '' });

  const fetchData = useCallback(async () => {
    const [contactRes, coursesRes, sourcesRes, staffRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', contactId).single(),
      supabase.from('courses').select('id, name').eq('is_active', true),
      supabase.from('lead_sources').select('id, name').eq('is_active', true),
      supabase.from('profiles').select('id, full_name'),
    ]);
    if (contactRes.data) {
      const c = contactRes.data;
      setForm({ full_name: c.full_name || '', phone: c.phone || '', email: c.email || '', interested_course: c.interested_course || '', status: c.status || 'waiting', lead_source: c.lead_source || '', assigned_staff_id: c.assigned_staff_id || '', notes: c.notes || '' });
    }
    setCourses(coursesRes.data || []);
    setSources(sourcesRes.data || []);
    setStaff(staffRes.data || []);
    setIsLoading(false);
  }, [supabase, contactId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTurkishPhone(form.phone)) { toast.error('Invalid Turkish phone number'); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('contacts').update(form).eq('id', contactId);
      if (error) throw error;
      toast.success('Contact updated');
      router.push(`/contacts/${contactId}`);
    } catch { toast.error('Failed to update'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><LoadingSpinner size={40} /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href={`/contacts/${contactId}`} className="btn btn-ghost btn-icon"><ArrowLeft size={20} /></Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Edit Contact</h1>
      </div>
      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div><label className="form-label">Full Name *</label><input type="text" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} required className="form-input" /></div>
            <div><label className="form-label">Phone *</label><input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} required maxLength={11} className="form-input" style={{ fontFamily: 'monospace' }} /></div>
            <div><label className="form-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="form-input" /></div>
            <div><label className="form-label">Course</label><select value={form.interested_course} onChange={(e) => setForm(p => ({ ...p, interested_course: e.target.value }))} className="form-input"><option value="">Select</option>{courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div><label className="form-label">Status</label><select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} className="form-input">{LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            <div><label className="form-label">Lead Source</label><select value={form.lead_source} onChange={(e) => setForm(p => ({ ...p, lead_source: e.target.value }))} className="form-input"><option value="">Select</option>{sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
            <div style={{ gridColumn: 'span 2' }}><label className="form-label">Assigned Staff</label><select value={form.assigned_staff_id} onChange={(e) => setForm(p => ({ ...p, assigned_staff_id: e.target.value }))} className="form-input"><option value="">None</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
            <div style={{ gridColumn: 'span 2' }}><label className="form-label">Notes</label><textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={4} className="form-input" style={{ resize: 'vertical' }} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <Link href={`/contacts/${contactId}`} className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSaving}><Save size={16} /> {isSaving ? 'Saving...' : 'Update Contact'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isValidTurkishPhone } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function AddContactPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    interested_course: '',
    lead_source: '',
  });

  const fetchOptions = useCallback(async () => {
    const [coursesRes, sourcesRes] = await Promise.all([
      supabase.from('courses').select('id, name').eq('is_active', true),
      supabase.from('lead_sources').select('id, name').eq('is_active', true),
    ]);
    setCourses(coursesRes.data || []);
    setSources(sourcesRes.data || []);
  }, [supabase]);

  useEffect(() => {
    fetchOptions();
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, [fetchOptions]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setForm(prev => ({ ...prev, phone: digits }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check for existing phone
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', form.phone)
        .maybeSingle();

      if (existing) {
        toast.error('Bu numara zaten kayıtlı.');
        setIsLoading(false);
        return;
      }

      // Quick insert without selecting back (avoids RLS read-on-write issues)
      const { error } = await supabase.from('contacts').insert([{
        full_name: form.full_name,
        phone: form.phone,
        interested_course: form.interested_course,
        lead_source: form.lead_source,
        status: 'waiting',
        assigned_staff_id: user?.id
      }]);

      if (error) throw error;
      
      toast.success('Başarıyla eklendi');
      
      // Small delay before redirect to ensure database sync
      setTimeout(() => {
        router.push('/contacts');
      }, 500);
      
    } catch (err) {
      console.error(err);
      toast.error('Hata oluştu, lütfen tekrar deneyin');
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href="/contacts" className="btn btn-ghost btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Yeni Kişi Ekle</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Sisteme yeni bir potansiyel müşteri kaydedin</p>
        </div>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="form-label">Ad Soyad *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Örn: Ahmet Yılmaz"
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Telefon Numarası *</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="05XX XXX XX XX"
                required
                maxLength={11}
                className="form-input"
                style={{ fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Sadece rakam giriniz</p>
            </div>

            <div>
              <label className="form-label">İlgilendiği Eğitim</label>
              <select
                value={form.interested_course}
                onChange={(e) => setForm(prev => ({ ...prev, interested_course: e.target.value }))}
                className="form-input"
                required
              >
                <option value="">Eğitim seçiniz</option>
                {courses.length === 0 && (
                  <>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Genel İngilizce">Genel İngilizce</option>
                    <option value="IELTS">IELTS</option>
                  </>
                )}
                {courses.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Lead Kaynağı</label>
              <select
                value={form.lead_source}
                onChange={(e) => setForm(prev => ({ ...prev, lead_source: e.target.value }))}
                className="form-input"
                required
              >
                <option value="">Kaynak seçiniz</option>
                {sources.length === 0 && (
                  <>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referans">Referans</option>
                  </>
                )}
                {sources.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <Link href="/contacts" className="btn btn-secondary">
              İptal
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              <Save size={16} />
              {isLoading ? 'Kaydediliyor...' : 'Kişiyi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

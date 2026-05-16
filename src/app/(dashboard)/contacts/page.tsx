'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate, formatPhone, getWhatsAppUrl, getCallUrl } from '@/lib/utils';
import { LEAD_STATUSES } from '@/lib/constants';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Users,
  Download,
  ChevronDown,
} from 'lucide-react';
import type { Contact, LeadStatus } from '@/lib/types';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20;

export default function ContactsPage() {
  const { role } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const supabase = createClient();

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (courseFilter) {
        query = query.eq('interested_course', courseFilter);
      }

      if (sourceFilter) {
        query = query.eq('lead_source', sourceFilter);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setContacts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Kişiler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, search, statusFilter, courseFilter, sourceFilter, currentPage]);

  const fetchFilters = useCallback(async () => {
    const { data: courseData } = await supabase.from('courses').select('id, name').eq('is_active', true);
    setCourses(courseData || []);

    const { data: sourceData } = await supabase.from('lead_sources').select('id, name').eq('is_active', true);
    setSources(sourceData || []);
  }, [supabase]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('Kişi silindi');
      setDeleteId(null);
      fetchContacts();
    } catch {
      toast.error('Kişi silinirken hata oluştu');
    }
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      toast.error('Dışa aktarılacak veri yok');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      contacts.map(c => ({
        'Ad Soyad': c.full_name,
        'Telefon': c.phone,
        'E-posta': c.email || '',
        'Kurs': c.interested_course || '',
        'Durum': c.status,
        'Aday Kaynağı': c.lead_source || '',
        'Kayıt Tarihi': formatDate(c.created_at),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kişiler');
    XLSX.writeFile(wb, `kisiler_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Başarıyla dışa aktarıldı');
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Kişiler</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>
            {totalCount} toplam kişi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={16} /> Dışa Aktar
          </button>
          <Link href="/contacts/new" className="btn btn-primary btn-sm">
            <Plus size={16} /> Kişi Ekle
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '0 12px', border: '1px solid #e2e8f0' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="İsim veya telefon ile ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, padding: '10px 0', width: '100%', color: '#334155' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="form-input"
            style={{ width: 'auto', minWidth: 160, fontSize: 13, padding: '8px 12px' }}
          >
            <option value="">Tüm Durumlar</option>
            {LEAD_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Daha Fazla Filtre <ChevronDown size={14} />
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ width: 'auto', minWidth: 160, fontSize: 13, padding: '8px 12px' }}
            >
              <option value="">Tüm Kurslar</option>
              {courses.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ width: 'auto', minWidth: 160, fontSize: 13, padding: '8px 12px' }}
            >
              <option value="">Tüm Kaynaklar</option>
              {sources.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setStatusFilter(''); setCourseFilter(''); setSourceFilter(''); setSearch(''); setCurrentPage(1); }}
            >
              Tümünü Temizle
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <LoadingSpinner size={32} />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={<Users size={48} color="#cbd5e1" />}
            title="Kişi bulunamadı"
            description="İlk kişinizi ekleyerek başlayın veya filtreleri ayarlayın."
            action={
              <Link href="/contacts/new" className="btn btn-primary btn-sm">
                <Plus size={16} /> Kişi Ekle
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>Kurs</th>
                  <th>Durum</th>
                  <th>Aday Kaynağı</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link
                        href={`/contacts/${contact.id}`}
                        style={{ color: '#1e293b', fontWeight: 500, textDecoration: 'none' }}
                      >
                        {contact.full_name}
                      </Link>
                      {contact.email && (
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{contact.email}</p>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {formatPhone(contact.phone)}
                    </td>
                    <td>{contact.interested_course || '—'}</td>
                    <td><StatusBadge status={contact.status} /></td>
                    <td style={{ color: '#64748b' }}>{contact.lead_source || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{formatDate(contact.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <a
                          href={getCallUrl(contact.phone)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Ara"
                        >
                          <Phone size={15} />
                        </a>
                        <a
                          href={getWhatsAppUrl(contact.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-icon btn-sm"
                          title="WhatsApp"
                          style={{ color: '#25D366' }}
                        >
                          <MessageCircle size={15} />
                        </a>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Görüntüle"
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          href={`/contacts/${contact.id}/edit`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Düzenle"
                        >
                          <Edit size={15} />
                        </Link>
                        {role === 'admin' && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Sil"
                            onClick={() => setDeleteId(contact.id)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Kişiyi Sil"
        message="Bu kişiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Sil"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        icon={<Trash2 size={24} />}
      />
    </div>
  );
}

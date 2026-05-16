'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDate, getRelativeTime } from '@/lib/utils';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Plus, CheckSquare, Clock, AlertTriangle, Flag } from 'lucide-react';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string }>>([]);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    let query = supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)');
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query.order('created_at', { ascending: false });
    setTasks((data || []) as Task[]);
    setIsLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { supabase.from('profiles').select('id, full_name').then(({ data }) => setStaff(data || [])); }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('tasks').insert({ ...form, created_by: user?.id, status: 'pending' });
    toast.success('Görev oluşturuldu');
    setShowForm(false);
    setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
    fetchTasks();
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    await supabase.from('tasks').update(update).eq('id', id);
    toast.success('Güncellendi');
    fetchTasks();
  };

  const priorityColor = (p: string) => {
    const found = TASK_PRIORITIES.find(tp => tp.value === p);
    return found?.color || '#94a3b8';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Görevler</h1><p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{tasks.length} görev</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Yeni Görev</button>
      </div>

      {showForm && (
        <div className="card animate-scale-in" style={{ padding: 24, marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Başlık *</label><input type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required className="form-input" /></div>
              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Açıklama</label><textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="form-input" /></div>
              <div><label className="form-label">Atanan Kişi *</label><select value={form.assigned_to} onChange={(e) => setForm(p => ({ ...p, assigned_to: e.target.value }))} required className="form-input"><option value="">Seçiniz</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
              <div><label className="form-label">Öncelik</label><select value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))} className="form-input">{TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div><label className="form-label">Teslim Tarihi</label><input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} className="form-input" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>İptal</button>
              <button type="submit" className="btn btn-primary btn-sm">Görev Oluştur</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('')}>Tümü</button>
        {TASK_STATUSES.map(s => <button key={s.value} className={`btn btn-sm ${statusFilter === s.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s.value)}>{s.label}</button>)}
      </div>

      {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner size={32} /></div> : tasks.length === 0 ? (
        <div className="card"><EmptyState icon={<CheckSquare size={48} color="#cbd5e1" />} title="Görev bulunamadı" description="İlk görevinizi oluşturun." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map(task => (
            <div key={task.id} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Flag size={14} color={priorityColor(task.priority)} />
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</h3>
                  <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: TASK_STATUSES.find(s => s.value === task.status)?.color === '#22c55e' ? '#f0fdf4' : '#f8fafc', color: TASK_STATUSES.find(s => s.value === task.status)?.color || '#94a3b8' }}>{TASK_STATUSES.find(s => s.value === task.status)?.label || task.status}</span>
                </div>
                {task.description && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{task.description}</p>}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                  <span>Atanan: {(task.assignee as unknown as Record<string, string>)?.full_name || '—'}</span>
                  {task.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Bitiş: {formatDate(task.due_date)}</span>}
                  <span>{getRelativeTime(task.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {task.status !== 'completed' && <button className="btn btn-success btn-sm" style={{ fontSize: 12 }} onClick={() => handleStatusUpdate(task.id, 'completed')}>✓ Tamamla</button>}
                {task.status === 'pending' && <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => handleStatusUpdate(task.id, 'in_progress')}>Başlat</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e'];

export default function ReportsPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [salesByStaff, setSalesByStaff] = useState<Array<{ name: string; sales: number; revenue: number }>>([]);
  const [conversionData, setConversionData] = useState<Array<{ name: string; value: number }>>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<Array<{ month: string; leads: number; sales: number; revenue: number }>>([]);
  const [summary, setSummary] = useState({ totalContacts: 0, totalSales: 0, totalRevenue: 0, totalTrainers: 0, totalStudents: 0, avgConversion: 0 });

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    // Summary counts
    const [contactsRes, salesRes, trainersRes, studentsRes] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('amount'),
      supabase.from('trainers').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('*', { count: 'exact', head: true }),
    ]);
    const totalRevenue = salesRes.data?.reduce((s, v) => s + (v.amount || 0), 0) || 0;
    const completedRes = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'sale_completed');
    const convRate = contactsRes.count ? Math.round(((completedRes.count || 0) / contactsRes.count) * 100) : 0;
    setSummary({ totalContacts: contactsRes.count || 0, totalSales: salesRes.data?.length || 0, totalRevenue, totalTrainers: trainersRes.count || 0, totalStudents: studentsRes.count || 0, avgConversion: convRate });

    // Sales by staff
    const { data: allSales } = await supabase.from('sales').select('amount, user_id, profiles(full_name)');
    if (allSales) {
      const staffMap = new Map<string, { name: string; sales: number; revenue: number }>();
      allSales.forEach((s: Record<string, unknown>) => {
        const name = (s.profiles as unknown as Record<string, string>)?.full_name || 'Unknown';
        const existing = staffMap.get(name) || { name, sales: 0, revenue: 0 };
        existing.sales++;
        existing.revenue += (s.amount as number) || 0;
        staffMap.set(name, existing);
      });
      setSalesByStaff(Array.from(staffMap.values()));
    }

    // Conversion data
    const { data: contacts } = await supabase.from('contacts').select('status');
    if (contacts) {
      const statusMap = new Map<string, number>();
      contacts.forEach(c => { const s = c.status || 'waiting'; statusMap.set(s, (statusMap.get(s) || 0) + 1); });
      const statusMapping: Record<string, string> = {
        'waiting': 'Bekliyor',
        'called': 'Arandı',
        'no_answer': 'Cevap Vermedi',
        'interested': 'İlgileniyor',
        'thinking': 'Düşünüyor',
        'appointment_scheduled': 'Randevu Planlandı',
        'sale_completed': 'Satış Yapıldı',
        'not_interested': 'İlgilenmiyor',
      };
      setConversionData(Array.from(statusMap.entries()).map(([name, value]) => ({ name: statusMapping[name] || name.replace(/_/g, ' '), value })));
    }

    // Monthly growth
    const months: typeof monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const [leadsRes, mSalesRes] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('sales').select('amount').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      ]);
      months.push({ month: start.toLocaleString('tr-TR', { month: 'short' }), leads: leadsRes.count || 0, sales: mSalesRes.data?.length || 0, revenue: mSalesRes.data?.reduce((s, v) => s + (v.amount || 0), 0) || 0 });
    }
    setMonthlyGrowth(months);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><LoadingSpinner size={40} /></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Raporlar ve Analizler</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Performans metriklerine genel bakış</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { title: 'Toplam Kişi', value: summary.totalContacts, icon: <Users size={20} />, color: '#3b82f6' },
          { title: 'Toplam Satış', value: summary.totalSales, icon: <DollarSign size={20} />, color: '#10b981' },
          { title: 'Gelir', value: formatCurrency(summary.totalRevenue), icon: <TrendingUp size={20} />, color: '#8b5cf6' },
          { title: 'Dönüşüm', value: `%${summary.avgConversion}`, icon: <BarChart3 size={20} />, color: '#f59e0b' },
          { title: 'Eğitmenler', value: summary.totalTrainers, icon: <GraduationCap size={20} />, color: '#06b6d4' },
          { title: 'Öğrenciler', value: summary.totalStudents, icon: <Calendar size={20} />, color: '#f43f5e' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: 20, borderLeft: `4px solid ${item.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{item.title}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{item.value}</p>
              </div>
              <div style={{ color: item.color, opacity: 0.5 }}>{item.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Aylık Büyüme</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Adaylar" />
              <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Satışlar" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Aday Dönüşüm Hunisi</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={conversionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {conversionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
            {conversionData.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff performance */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Temsilci Satış Performansı</h3>
        {salesByStaff.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByStaff}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Satış Adedi" />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Gelir" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Henüz satış verisi yok</p>}
      </div>
    </div>
  );
}

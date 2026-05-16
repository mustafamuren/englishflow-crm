'use client';

import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import StatCard from '@/components/ui/StatCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';
import {
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Activity,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

export default function DashboardPage() {
  const { stats, recentActivities, upcomingAppointments, isLoading } = useDashboardStats();
  const [leadsByStatus, setLeadsByStatus] = useState<Array<{ name: string; value: number }>>([]);
  const [monthlySalesData, setMonthlySalesData] = useState<Array<{ month: string; revenue: number; sales: number }>>([]);
  const [leadSourceData, setLeadSourceData] = useState<Array<{ name: string; value: number }>>([]);
  const supabase = createClient();

  const fetchChartData = useCallback(async () => {
    // Leads by status
    const { data: contacts } = await supabase.from('contacts').select('status');
    if (contacts) {
      const statusMap = new Map<string, number>();
      contacts.forEach(c => {
        const status = c.status || 'waiting';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
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
      setLeadsByStatus(
        Array.from(statusMap.entries()).map(([name, value]) => ({
          name: statusMapping[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value,
        }))
      );
    }

    // Lead source data
    const { data: sourceContacts } = await supabase.from('contacts').select('lead_source');
    if (sourceContacts) {
      const sourceMap = new Map<string, number>();
      sourceContacts.forEach(c => {
        const src = c.lead_source || 'Unknown';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      setLeadSourceData(
        Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }))
      );
    }

    // Monthly sales (last 6 months)
    const months: Array<{ month: string; revenue: number; sales: number }> = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: allSales } = await supabase
      .from('sales')
      .select('amount, created_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthSales = (allSales || []).filter(s => {
        const sd = new Date(s.created_at);
        return sd.getMonth() === m && sd.getFullYear() === y;
      });

      months.push({
        month: d.toLocaleString('tr-TR', { month: 'short' }),
        revenue: monthSales.reduce((s, v) => s + (v.amount || 0), 0),
        sales: monthSales.length,
      });
    }
    setMonthlySalesData(months);
  }, [supabase]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Panel
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Tekrar hoş geldiniz! İşte CRM özetiniz.
        </p>
      </div>

      {/* Stats row */}
      <div
        className="stagger-children"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          title="Toplam Aday"
          value={stats.totalLeads}
          change="bu ay"
          changeType="neutral"
          icon={<Users size={22} />}
          accentClass="stat-card-blue"
        />
        <StatCard
          title="Toplam Satış"
          value={stats.totalSales}
          change="tamamlanan satış"
          changeType="positive"
          icon={<DollarSign size={22} />}
          accentClass="stat-card-green"
        />
        <StatCard
          title="Aylık Gelir"
          value={formatCurrency(stats.monthlyRevenue)}
          change="güncel ay"
          changeType="positive"
          icon={<TrendingUp size={22} />}
          accentClass="stat-card-purple"
        />
        <StatCard
          title="Yaklaşan Randevular"
          value={stats.appointmentCount}
          change="planlanan"
          changeType="neutral"
          icon={<Calendar size={22} />}
          accentClass="stat-card-amber"
        />
        <StatCard
          title="Dönüşüm Oranı"
          value={`%${stats.conversionRate}`}
          change="adaydan satışa"
          changeType={stats.conversionRate > 20 ? 'positive' : 'neutral'}
          icon={<Target size={22} />}
          accentClass="stat-card-cyan"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: 24, gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>
            Aylık Gelir
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlySalesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Bar Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>
            Aylık Satış Adedi
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Pie charts + Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Leads by Status */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>
            Duruma Göre Adaylar
          </h3>
          {leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={leadsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {leadsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <p>Henüz veri yok</p>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
            {leadsByStatus.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>

        {/* Lead Sources */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>
            Aday Kaynakları
          </h3>
          {leadSourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {leadSourceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <p>Henüz veri yok</p>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
            {leadSourceData.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[(i + 3) % COLORS.length] }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities + Upcoming */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recent Activities */}
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Son Etkinlikler</h3>
              <Activity size={16} color="#94a3b8" />
            </div>
            {recentActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentActivities.slice(0, 4).map((activity) => (
                  <div key={activity.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <p style={{ color: '#334155', lineHeight: 1.4 }}>{activity.description}</p>
                      <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                        {getRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                Son etkinlik yok
              </p>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Yaklaşanlar</h3>
              <Clock size={16} color="#94a3b8" />
            </div>
            {upcomingAppointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingAppointments.slice(0, 4).map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/appointments`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: '#f8fafc',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{apt.contact_name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>
                        {formatDate(apt.date)} at {apt.time}
                      </p>
                    </div>
                    <ArrowRight size={14} color="#94a3b8" />
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                Yaklaşan randevu yok
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

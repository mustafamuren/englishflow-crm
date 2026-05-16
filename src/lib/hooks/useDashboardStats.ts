'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardStats } from '@/lib/types';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    appointmentCount: 0,
    conversionRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: string;
    description: string;
    created_at: string;
    user_name?: string;
  }>>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    contact_name: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { count: totalLeads },
        { count: totalSales },
        { data: monthlySales },
        { count: appointmentCount },
        { count: completedSales }
      ] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('amount').gte('created_at', startOfMonth.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'sale_completed')
      ]);

      const monthlyRevenue = monthlySales?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const conversionRate = totalLeads ? Math.round(((completedSales || 0) / totalLeads) * 100) : 0;

      setStats({
        totalLeads: totalLeads || 0,
        totalSales: totalSales || 0,
        monthlyRevenue,
        appointmentCount: appointmentCount || 0,
        conversionRate,
      });

      // Recent activities
      const { data: activities } = await supabase
        .from('contact_activities')
        .select('id, type, description, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(8);

      setRecentActivities(activities || []);

      // Upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, title, date, time, contacts(full_name)')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(5);

      setUpcomingAppointments(
        (appointments || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          date: a.date as string,
          time: a.time as string,
          contact_name: (a.contacts as Record<string, string>)?.full_name || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, recentActivities, upcomingAppointments, isLoading, refresh: fetchStats };
}

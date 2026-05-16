// ============================================================
// Uzilla CRM — TypeScript Type Definitions
// ============================================================

export type UserRole = 'admin' | 'sales_rep';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'waiting'
  | 'called'
  | 'no_answer'
  | 'interested'
  | 'thinking'
  | 'appointment_scheduled'
  | 'sale_completed'
  | 'not_interested';

export interface Contact {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  interested_course?: string;
  status: LeadStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  lead_source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_staff?: Profile;
  course?: Course;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  user_id: string;
  type: 'status_change' | 'note_added' | 'call' | 'whatsapp' | 'appointment' | 'follow_up' | 'sale' | 'other';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface FollowUp {
  id: string;
  contact_id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  contact?: Contact;
  user?: Profile;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'rescheduled';

export interface Appointment {
  id: string;
  contact_id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  user?: Profile;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'installment' | 'iyzico';

export interface Sale {
  id: string;
  contact_id: string;
  user_id: string;
  course_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  contract_url?: string;
  invoice_url?: string;
  trainer_id?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  user?: Profile;
  course?: Course;
  trainer?: Trainer;
}

export interface Trainer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  languages?: string[];
  expertise?: string[];
  hourly_rate?: number;
  zoom_link?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerAvailability {
  id: string;
  trainer_id: string;
  day_of_week: number; // 0-6, Monday=0
  start_time: string;
  end_time: string;
}

export interface Student {
  id: string;
  contact_id?: string;
  full_name: string;
  phone?: string;
  email?: string;
  trainer_id?: string;
  course_id?: string;
  package_name?: string;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  level?: string;
  speaking_club_access: boolean;
  zoom_link?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  trainer?: Trainer;
  course?: Course;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  created_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration?: string;
  is_active: boolean;
  created_at: string;
}

export interface LeadSource {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  created_at: string;
}

// Dashboard stat types
export interface DashboardStats {
  totalLeads: number;
  totalSales: number;
  monthlyRevenue: number;
  appointmentCount: number;
  conversionRate: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

-- ============================================================
-- Uzilla CRM — Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text not null default '',
  role text not null default 'sales_rep' check (role in ('admin', 'sales_rep')),
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- COURSES
-- ============================================================
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric default 0,
  duration text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- LEAD SOURCES
-- ============================================================
create table if not exists public.lead_sources (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTACTS
-- ============================================================
create table if not exists public.contacts (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text not null,
  email text,
  interested_course text,
  status text not null default 'waiting' check (status in ('waiting', 'called', 'no_answer', 'interested', 'thinking', 'appointment_scheduled', 'sale_completed', 'not_interested')),
  assigned_staff_id uuid references public.profiles(id),
  assigned_staff_name text,
  lead_source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contacts_status on public.contacts(status);
create index if not exists idx_contacts_phone on public.contacts(phone);
create index if not exists idx_contacts_assigned on public.contacts(assigned_staff_id);

-- ============================================================
-- CONTACT NOTES
-- ============================================================
create table if not exists public.contact_notes (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTACT ACTIVITIES
-- ============================================================
create table if not exists public.contact_activities (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  type text not null default 'other',
  description text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- FOLLOW UPS
-- ============================================================
create table if not exists public.follow_ups (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  title text not null,
  description text,
  date date not null,
  time time not null,
  duration_minutes int default 30,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed', 'cancelled', 'rescheduled')),
  location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_appointments_date on public.appointments(date);

-- ============================================================
-- TRAINERS
-- ============================================================
create table if not exists public.trainers (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  email text,
  phone text,
  nationality text,
  languages text[],
  expertise text[],
  hourly_rate numeric default 0,
  zoom_link text,
  bio text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TRAINER AVAILABILITY
-- ============================================================
create table if not exists public.trainer_availability (
  id uuid default uuid_generate_v4() primary key,
  trainer_id uuid references public.trainers(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

-- ============================================================
-- SALES
-- ============================================================
create table if not exists public.sales (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  course_id uuid references public.courses(id),
  amount numeric not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer', 'credit_card', 'installment', 'iyzico')),
  notes text,
  contract_url text,
  invoice_url text,
  trainer_id uuid references public.trainers(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references public.sales(id) on delete cascade not null,
  amount numeric not null,
  payment_method text not null,
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- STUDENTS
-- ============================================================
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id),
  full_name text not null,
  phone text,
  email text,
  trainer_id uuid references public.trainers(id),
  course_id uuid references public.courses(id),
  package_name text,
  total_lessons int default 0,
  completed_lessons int default 0,
  remaining_lessons int default 0,
  level text,
  speaking_club_access boolean default false,
  zoom_link text,
  start_date date,
  end_date date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- STUDENT ATTENDANCE
-- ============================================================
create table if not exists public.student_attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  date date not null default current_date,
  status text not null default 'present' check (status in ('present', 'absent', 'late', 'excused')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS
-- ============================================================
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) not null,
  created_by uuid references public.profiles(id) not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_notes enable row level security;
alter table public.contact_activities enable row level security;
alter table public.follow_ups enable row level security;
alter table public.appointments enable row level security;
alter table public.sales enable row level security;
alter table public.payments enable row level security;
alter table public.trainers enable row level security;
alter table public.trainer_availability enable row level security;
alter table public.students enable row level security;
alter table public.student_attendance enable row level security;
alter table public.tasks enable row level security;
alter table public.courses enable row level security;
alter table public.lead_sources enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- ============================================================
-- POLICIES
-- ============================================================

-- Profiles: Users can read all profiles, update own
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Contacts: Admin sees all, sales rep sees own
create policy "Admin full access to contacts" on public.contacts for all using (public.is_admin());
create policy "Sales rep view assigned contacts" on public.contacts for select using (assigned_staff_id = auth.uid() or public.is_admin());
create policy "Sales rep insert contacts" on public.contacts for insert with check (true);
create policy "Sales rep update assigned contacts" on public.contacts for update using (assigned_staff_id = auth.uid() or public.is_admin());

-- Notes, Activities, Follow-ups: authenticated users
create policy "Authenticated access notes" on public.contact_notes for all using (auth.uid() is not null);
create policy "Authenticated access activities" on public.contact_activities for all using (auth.uid() is not null);
create policy "Authenticated access follow_ups" on public.follow_ups for all using (auth.uid() is not null);

-- Appointments
create policy "Authenticated access appointments" on public.appointments for all using (auth.uid() is not null);

-- Sales, Payments
create policy "Authenticated access sales" on public.sales for all using (auth.uid() is not null);
create policy "Authenticated access payments" on public.payments for all using (auth.uid() is not null);

-- Trainers, Availability
create policy "Authenticated access trainers" on public.trainers for all using (auth.uid() is not null);
create policy "Authenticated access trainer_availability" on public.trainer_availability for all using (auth.uid() is not null);

-- Students, Attendance
create policy "Authenticated access students" on public.students for all using (auth.uid() is not null);
create policy "Authenticated access attendance" on public.student_attendance for all using (auth.uid() is not null);

-- Tasks
create policy "Authenticated access tasks" on public.tasks for all using (auth.uid() is not null);

-- Courses, Lead Sources
create policy "Authenticated access courses" on public.courses for all using (auth.uid() is not null);
create policy "Authenticated access lead_sources" on public.lead_sources for all using (auth.uid() is not null);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default courses
insert into public.courses (name, description, price) values
  ('General English', 'Standard English language course', 5000),
  ('Business English', 'Professional business English', 7500),
  ('IELTS Preparation', 'IELTS exam preparation course', 8000),
  ('Speaking Club', 'Conversational English practice', 2000),
  ('Kids English', 'English for children ages 6-12', 4000)
on conflict do nothing;

-- Default lead sources
insert into public.lead_sources (name) values
  ('Instagram'),
  ('Google Ads'),
  ('Facebook'),
  ('Website'),
  ('Referral'),
  ('Walk-in'),
  ('Phone Inquiry'),
  ('WhatsApp')
on conflict do nothing;

// ============================================================
// Uzilla CRM — Constants
// ============================================================

export const LEAD_STATUSES = [
  { value: 'waiting', label: 'Bekliyor', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 'called', label: 'Arandı', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'no_answer', label: 'Cevap Vermedi', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'interested', label: 'İlgileniyor', color: '#10b981', bg: '#ecfdf5' },
  { value: 'thinking', label: 'Düşünüyor', color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'appointment_scheduled', label: 'Randevu Planlandı', color: '#06b6d4', bg: '#ecfeff' },
  { value: 'sale_completed', label: 'Satış Yapıldı', color: '#22c55e', bg: '#f0fdf4' },
  { value: 'not_interested', label: 'İlgilenmiyor', color: '#ef4444', bg: '#fef2f2' },
] as const;

export const APPOINTMENT_STATUSES = [
  { value: 'scheduled', label: 'Planlandı', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'completed', label: 'Tamamlandı', color: '#22c55e', bg: '#f0fdf4' },
  { value: 'missed', label: 'Gelinmedi', color: '#ef4444', bg: '#fef2f2' },
  { value: 'cancelled', label: 'İptal Edildi', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 'rescheduled', label: 'Yeniden Planlandı', color: '#f59e0b', bg: '#fffbeb' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Nakit' },
  { value: 'bank_transfer', label: 'Banka Transferi' },
  { value: 'credit_card', label: 'Kredi Kartı' },
  { value: 'installment', label: 'Taksit' },
  { value: 'iyzico', label: 'Iyzico' },
] as const;

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Düşük', color: '#94a3b8' },
  { value: 'medium', label: 'Orta', color: '#f59e0b' },
  { value: 'high', label: 'Yüksek', color: '#ef4444' },
  { value: 'urgent', label: 'Acil', color: '#dc2626' },
] as const;

export const TASK_STATUSES = [
  { value: 'pending', label: 'Bekliyor', color: '#94a3b8' },
  { value: 'in_progress', label: 'Devam Ediyor', color: '#3b82f6' },
  { value: 'completed', label: 'Tamamlandı', color: '#22c55e' },
  { value: 'cancelled', label: 'İptal Edildi', color: '#ef4444' },
] as const;

export const STUDENT_LEVELS = [
  'A1 - Başlangıç',
  'A2 - Temel',
  'B1 - Orta',
  'B2 - Üst Orta',
  'C1 - İleri',
  'C2 - Yetkin',
] as const;

export const DAYS_OF_WEEK = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const;

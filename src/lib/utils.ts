import { LeadStatus, Priority } from './types';

// Simple cn utility (no need to install clsx for just this)
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}

// ─── Status Colors ─────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<LeadStatus, string> = {
  'New': 'bg-gray-100 text-gray-700 border-gray-200',
  'Needs research': 'bg-purple-100 text-purple-700 border-purple-200',
  'Ready to contact': 'bg-blue-100 text-blue-700 border-blue-200',
  'Contacted': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'No answer': 'bg-slate-100 text-slate-600 border-slate-200',
  'Interested': 'bg-teal-100 text-teal-700 border-teal-200',
  'Demo website started': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Demo website sent': 'bg-violet-100 text-violet-700 border-violet-200',
  'Follow up needed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Meeting scheduled': 'bg-orange-100 text-orange-700 border-orange-200',
  'Proposal sent': 'bg-amber-100 text-amber-700 border-amber-200',
  'Won': 'bg-green-100 text-green-700 border-green-200',
  'Lost': 'bg-red-100 text-red-600 border-red-200',
  'Not a fit': 'bg-gray-100 text-gray-500 border-gray-200',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  'Cold': 'bg-blue-50 text-blue-600 border-blue-200',
  'Warm': 'bg-yellow-50 text-yellow-600 border-yellow-200',
  'Hot': 'bg-orange-100 text-orange-700 border-orange-200',
  'Urgent': 'bg-red-100 text-red-700 border-red-200',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  'Cold': 'bg-blue-400',
  'Warm': 'bg-yellow-400',
  'Hot': 'bg-orange-500',
  'Urgent': 'bg-red-600',
};

// ─── Constants ─────────────────────────────────────────────────────────────────

export const LEAD_STATUSES: LeadStatus[] = [
  'New', 'Needs research', 'Ready to contact', 'Contacted', 'No answer',
  'Interested', 'Demo website started', 'Demo website sent', 'Follow up needed',
  'Meeting scheduled', 'Proposal sent', 'Won', 'Lost', 'Not a fit',
];

export const PRIORITIES: Priority[] = ['Cold', 'Warm', 'Hot', 'Urgent'];

export const INDUSTRIES = [
  'Auto Repair', 'Bakery', 'Bar/Pub', 'Beauty Salon', 'Carpet Cleaning',
  'Chiropractor', 'Cleaning Service', 'Coffee Shop', 'Contractor', 'Dentist',
  'Electrician', 'Florist', 'HVAC', 'Insurance', 'Landscaping', 'Law Firm',
  'Mechanic', 'Painting', 'Pest Control', 'Photographer', 'Physical Therapy',
  'Pizza/Restaurant', 'Plumber', 'Real Estate', 'Roofer', 'Salon/Spa',
  'Towing', 'Veterinary', 'Windows/Doors', 'Other',
];

export const LEAD_SOURCES = [
  'Manual research', 'Google Maps', 'Yelp', 'Facebook research', 'ChatGPT research',
  'Referral', 'Cold call list', 'Walk-in', 'Website inquiry', 'LinkedIn',
  'Chamber of Commerce', 'Other',
];

export const WEBSITE_QUALITY_OPTIONS = [
  'None', 'Poor — very old design', 'Poor — not mobile-friendly',
  'Average — functional but outdated', 'Average — decent but needs SEO',
  'Good — modern and functional', 'Excellent',
];

export const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export const SERVICE_OPPORTUNITIES = [
  'Website design', 'Website redesign', 'Custom CRM', 'Local SEO',
  'Social media management', 'Facebook Ads', 'Google Ads', 'Lead generation',
  'Website + CRM bundle', 'Google Business Profile cleanup',
];

// ─── Date Helpers ──────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function isDueToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

// ─── Template variable replacement ────────────────────────────────────────────

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── CSV helpers ───────────────────────────────────────────────────────────────

export function jsonToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = val == null ? '' : Array.isArray(val) ? val.join(';') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ─── Slug ──────────────────────────────────────────────────────────────────────

export function truncate(str: string, len = 40): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

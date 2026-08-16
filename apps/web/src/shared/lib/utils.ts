import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'hh:mm a');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    ARRIVED: 'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

export function getPriceRangeLabel(range: number): string {
  return '₹'.repeat(range);
}

export function truncate(str: string, length = 80): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

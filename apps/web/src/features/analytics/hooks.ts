import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export const analyticsKeys = {
  summary: (salonId: string, range: string) => ['analytics', 'summary', salonId, range] as const,
  revenue: (salonId: string, range: string) => ['analytics', 'revenue', salonId, range] as const,
  services: (salonId: string, range: string) => ['analytics', 'services', salonId, range] as const,
  staff: (salonId: string, range: string) => ['analytics', 'staff', salonId, range] as const,
  peakHours: (salonId: string, range: string) => ['analytics', 'peak-hours', salonId, range] as const,
};

interface DateRange {
  startDate: string;
  endDate: string;
}

export function useAnalyticsSummary(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.summary(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const { data } = await api.get('/analytics/summary', {
        params: { salonId, ...range },
      });
      return data;
    },
    enabled: !!salonId,
  });
}

export function useRevenueChart(salonId: string, range: DateRange, groupBy = 'day') {
  return useQuery({
    queryKey: analyticsKeys.revenue(salonId, `${range.startDate}-${range.endDate}-${groupBy}`),
    queryFn: async () => {
      const { data } = await api.get('/analytics/revenue', {
        params: { salonId, ...range, groupBy },
      });
      return data;
    },
    enabled: !!salonId,
  });
}

export function usePopularServices(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.services(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const { data } = await api.get('/analytics/services', {
        params: { salonId, ...range },
      });
      return data;
    },
    enabled: !!salonId,
  });
}

export function useStaffPerformance(salonId: string, range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.staff(salonId, `${range.startDate}-${range.endDate}`),
    queryFn: async () => {
      const { data } = await api.get('/analytics/staff-performance', {
        params: { salonId, ...range },
      });
      return data;
    },
    enabled: !!salonId,
  });
}

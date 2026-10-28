// src/services/dashboardService.ts
import api from './api';

export interface DashboardStats {
  activeMatters: number;
  upcomingHearings: number;
  outstandingInvoiceKes: number;
  unbilledHoursThisMonth: number;
}

export interface ActivityItem {
  id: string;
  type: 'doc' | 'note' | 'user' | 'bill' | 'alert';
  text: string;
  matter?: string;
  time: string; // ISO string
}

export interface DeadlineItem {
  id: string;
  title: string;
  matter: string;
  date: string; // ISO string
}

const dashboardService = {
  getStats: () =>
    api.get<DashboardStats>('/dashboard/stats').then(r => r.data),

  getActivity: () =>
    api.get<ActivityItem[]>('/dashboard/activity').then(r => r.data),

  getDeadlines: () =>
    api.get<DeadlineItem[]>('/dashboard/deadlines').then(r => r.data),
};

export default dashboardService;
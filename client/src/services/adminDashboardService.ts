// src/services/adminDashboardService.ts
import api from './api';

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  activeMatters: number;
  totalDocuments: number;
  usersByRole: Record<string, number>;
}

export interface SystemHealth {
  databaseOnline: boolean;
  storageOnline: boolean;
  apiResponseMs: number;
  storageUsedBytes: number;
  activeSessions: number;
}

export interface AuditLogEntry {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  changes: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogFilters {
  actions: string[];
  entityNames: string[];
  performers: string[];
}

export interface AuditLogSearchParams {
  page?: number;
  pageSize?: number;
  performedBy?: string;
  action?: string;
  entityName?: string;
  from?: string;
  to?: string;
}

const adminDashboardService = {
  getStats: () =>
    api.get<AdminDashboardStats>('/admin-dashboard/stats').then(r => r.data),

  getHealth: () =>
    api.get<SystemHealth>('/admin-dashboard/health').then(r => r.data),

  getAuditLog: (page = 1, pageSize = 30) =>
    api.get<AuditLogEntry[]>('/admin-dashboard/audit-log', {
      params: { page, pageSize },
    }).then(r => r.data),

  searchAuditLog: (params: AuditLogSearchParams) =>
    api.get<AuditLogPage>('/admin-dashboard/audit-log/search', {
      params,
    }).then(r => r.data),

  getAuditLogFilters: () =>
    api.get<AuditLogFilters>('/admin-dashboard/audit-log/filters').then(r => r.data),
};

export default adminDashboardService;
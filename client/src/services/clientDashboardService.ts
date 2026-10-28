// src/services/clientDashboardService.ts
import api from './api';

export interface ClientDashboardStats {
  activeCases: number;
  upcomingHearings: number;
  sharedDocuments: number;
  outstandingBalanceKes: number;
}

export interface ClientMatter {
  id: string;
  title: string;
  jicmsCaseNumber: string;
  courtStation: string;
  status: string;
  hearingDate: string | null;
  filingDeadline: string | null;
  assignedLawyerName: string | null;
}

export interface ClientInvoice {
  id: string;
  matterTitle: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  status: string;
}

export interface ClientDocument {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  version: number;
  uploadedAt: string;
}

const clientDashboardService = {
  // Dashboard summary
  getStats: () =>
    api.get<ClientDashboardStats>('/client-dashboard/stats').then(r => r.data),

  getMatters: () =>
    api.get<ClientMatter[]>('/client-dashboard/matters').then(r => r.data),

  getInvoices: () =>
    api.get<ClientInvoice[]>('/client-dashboard/invoices').then(r => r.data),

  // Full pages
  getAllMatters: () =>
    api.get<ClientMatter[]>('/client-dashboard/all-matters').then(r => r.data),

  getAllInvoices: (page = 1, pageSize = 20) =>
    api.get<ClientInvoice[]>('/client-dashboard/all-invoices', {
      params: { page, pageSize },
    }).then(r => r.data),

  // Single invoice — for polling
  getInvoice: (id: string) =>
    api.get<ClientInvoice>(`/client-dashboard/invoices/${id}`).then(r => r.data),

  // Documents
  getMatterDocuments: (matterId: string) =>
    api.get<ClientDocument[]>(`/client-dashboard/matters/${matterId}/documents`).then(r => r.data),

  getDocumentDownloadUrl: (documentId: string) =>
    api.get<{ url: string }>(`/client-dashboard/documents/${documentId}/download`).then(r => r.data.url),
};

export default clientDashboardService;
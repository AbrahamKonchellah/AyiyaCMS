// src/services/invoiceService.ts
import api from './api';

export interface InvoiceDto {
  id: string;
  clientId: string;
  clientName: string;
  matterId: string | null;
  matterTitle: string | null;
  feeNoteId: string | null;
  feeNoteNumber: string | null;
  invoiceNumber: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  status: string; // Draft | Sent | Paid | Overdue
  createdByName: string;
  sentByName: string | null;
  sentAt: string | null;
  paidAt: string | null;
  mpesaReceiptNumber: string | null;
}

export interface GenerateInvoiceRequest {
  feeNoteId: string;
  dueDate: string;
}

const invoiceService = {
  getForMatter: (matterId: string) =>
    api.get<InvoiceDto[]>(`/invoices/matter/${matterId}`).then(r => r.data),

  getAll: (status?: string) =>
    api.get<InvoiceDto[]>('/invoices', { params: status ? { status } : {} })
      .then(r => r.data),

  generate: (data: GenerateInvoiceRequest) =>
    api.post<InvoiceDto>('/invoices/generate', data).then(r => r.data),

  markSent: (id: string) =>
    api.patch(`/invoices/${id}/send`).then(r => r.data),

  markPaid: (id: string) =>
    api.patch(`/invoices/${id}/mark-paid`).then(r => r.data),

  getDownloadUrl: (id: string) =>
    api.get<{ url: string }>(`/invoices/${id}/download`).then(r => r.data.url),
};

export default invoiceService;
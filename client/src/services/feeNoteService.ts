// src/services/feeNoteService.ts
import api from './api';

export interface FeeNoteDto {
  id: string;
  matterId: string;
  matterTitle: string;
  feeNoteNumber: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: 'PendingApproval' | 'Approved';
  generatedByName: string;
  approvedByName: string | null;
  approvedAt: string | null;
  generatedAt: string;
}

const feeNoteService = {
  getForMatter: (matterId: string) =>
    api.get<FeeNoteDto[]>(`/fee-notes/matter/${matterId}`).then(r => r.data),

  generate: (matterId: string) =>
    api.post<FeeNoteDto>('/fee-notes/generate', { matterId }).then(r => r.data),

  approve: (id: string) =>
    api.patch(`/fee-notes/${id}/approve`).then(r => r.data),

  getDownloadUrl: (id: string) =>
    api.get<{ url: string }>(`/fee-notes/${id}/download`).then(r => r.data.url),
};

export default feeNoteService;
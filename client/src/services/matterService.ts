// src/services/matterService.ts
import api from './api';

export interface MatterStaffDto {
  userId: string;
  name: string;
  role: string;
  assignedAt: string;
}

export interface MatterDto {
  id: string;
  title: string;
  jicmsCaseNumber: string;
  courtStation: string;
  status: string;
  hearingDate: string | null;
  filingDeadline: string | null;
  clientId: string;
  clientName: string;
  assignedLawyerId: string | null;
  assignedLawyerName: string | null;
  staff: MatterStaffDto[];   // ← new
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatterRequest {
  title: string;
  jicmsCaseNumber: string;
  courtStation: string;
  clientId: string;
  assignedLawyerId: string | null;
  hearingDate: string | null;
  filingDeadline: string | null;
}

export interface UpdateMatterRequest {
  title: string;
  jicmsCaseNumber: string;
  courtStation: string;
  status: string;
  assignedLawyerId: string | null;
  hearingDate: string | null;
  filingDeadline: string | null;
}

export interface AddMatterStaffRequest {
  userId: string;
  role: string;
}

const matterService = {
  getAll: () =>
    api.get<MatterDto[]>('/matters').then(r => r.data),

  getById: (id: string) =>
    api.get<MatterDto>(`/matters/${id}`).then(r => r.data),

  create: (data: CreateMatterRequest) =>
    api.post<MatterDto>('/matters', data).then(r => r.data),

  update: (id: string, data: UpdateMatterRequest) =>
    api.put<MatterDto>(`/matters/${id}`, data).then(r => r.data),

  close: (id: string) =>
    api.patch(`/matters/${id}/close`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/matters/${id}`).then(r => r.data),

  // ── Staff ──────────────────────────────────────────
  getStaff: (matterId: string) =>
    api.get<MatterStaffDto[]>(`/matters/${matterId}/staff`).then(r => r.data),

  addStaff: (matterId: string, data: AddMatterStaffRequest) =>
    api.post(`/matters/${matterId}/staff`, data).then(r => r.data),

  removeStaff: (matterId: string, userId: string) =>
    api.delete(`/matters/${matterId}/staff/${userId}`).then(r => r.data),
};

export default matterService;
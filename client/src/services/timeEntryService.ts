// src/services/timeEntryService.ts
import api from './api';

export interface TimeEntryDto {
  id: string;
  matterId: string;
  matterTitle: string;
  userId: string;
  userName: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  isBilled: boolean;
  entryDate: string;
  createdAt: string;
}

export interface CreateTimeEntryRequest {
  matterId: string;
  description: string;
  hours: number;
  rate: number;
  entryDate: string;
}

export interface UpdateTimeEntryRequest {
  description: string;
  hours: number;
  rate: number;
  entryDate: string;
}

const timeEntryService = {
  getForMatter: (matterId: string) =>
    api.get<TimeEntryDto[]>(`/time-entries/matter/${matterId}`).then(r => r.data),

  create: (data: CreateTimeEntryRequest) =>
    api.post<TimeEntryDto>('/time-entries', data).then(r => r.data),

  update: (id: string, data: UpdateTimeEntryRequest) =>
    api.put(`/time-entries/${id}`, data).then(r => r.data),

  markBilled: (id: string) =>
    api.patch(`/time-entries/${id}/billed`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/time-entries/${id}`).then(r => r.data),
};

export default timeEntryService;
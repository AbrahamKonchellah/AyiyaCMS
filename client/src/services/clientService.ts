// src/services/clientService.ts
import api from './api';

export interface ClientDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  matterCount: number;
  createdAt: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface LawyerOption {
  id: string;
  name: string;
}

const clientService = {
  getAll: (search?: string) =>
    api.get<ClientDto[]>('/clients', { params: search ? { search } : {} })
      .then(r => r.data),

  getById: (id: string) =>
    api.get<{ client: ClientDto; matters: any[] }>(`/clients/${id}`)
      .then(r => r.data),

  getLawyers: () =>
    api.get<LawyerOption[]>('/clients/lawyers').then(r => r.data),

  create: (data: CreateClientRequest) =>
    api.post<ClientDto>('/clients', data).then(r => r.data),

  update: (id: string, data: CreateClientRequest) =>
    api.put<ClientDto>(`/clients/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/clients/${id}`).then(r => r.data),
};

export default clientService;
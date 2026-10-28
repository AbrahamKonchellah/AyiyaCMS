// src/services/adminService.ts
import api from './api';

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface InviteUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const adminService = {
  getUsers: () =>
    api.get<UserDto[]>('/admin/users').then(r => r.data),

  inviteUser: (data: InviteUserRequest) =>
    api.post('/admin/users/invite', data).then(r => r.data),

  updateRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data),

  deactivateUser: (id: string) =>
    api.patch(`/admin/users/${id}/deactivate`).then(r => r.data),

  reactivateUser: (id: string) =>
    api.patch(`/admin/users/${id}/reactivate`).then(r => r.data),

  resetPassword: (id: string) =>
    api.post(`/admin/users/${id}/reset-password`).then(r => r.data),
};

export default adminService;
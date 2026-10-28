import api from './api';

export interface MatterNote {
  id: string;
  matterId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  visibility: 'Internal' | 'Client';
  parentNoteId: string | null;
  createdAt: string;
}

export interface CreateNoteRequest {
  content: string;
  visibility: 'Internal' | 'Client';
  parentNoteId: string | null;
}

const matterNoteService = {
  // Staff
  getNotes: (matterId: string) =>
    api.get<MatterNote[]>(`/matters/${matterId}/notes`).then(r => r.data),

  createNote: (matterId: string, data: CreateNoteRequest) =>
    api.post<MatterNote>(`/matters/${matterId}/notes`, data).then(r => r.data),

  deleteNote: (matterId: string, noteId: string) =>
    api.delete(`/matters/${matterId}/notes/${noteId}`).then(r => r.data),

  // Client portal
  getClientNotes: (matterId: string) =>
    api.get<MatterNote[]>(`/client-dashboard/matters/${matterId}/notes`).then(r => r.data),

  createClientNote: (matterId: string, content: string) =>
    api.post<MatterNote>(`/client-dashboard/matters/${matterId}/notes`, {
      content,
      visibility: 'Client',
      parentNoteId: null,
    }).then(r => r.data),
};

export default matterNoteService;
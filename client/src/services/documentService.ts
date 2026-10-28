// src/services/documentService.ts
import api from './api';

export interface DocumentDto {
  id: string;
  originalFileName: string;
  fileKey: string;
  contentType: string;
  fileSizeBytes: number;
  checksum: string;
  version: number;
  matterId: string | null;
  matterTitle: string | null;
  clientName: string | null;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;

}

export interface DocumentSearchEntry {
  id: string;
  originalFileName: string;
  content: string;
  matterId: string | null;
  matterTitle: string | null;
  clientName: string | null;
  contentType: string;
  fileSizeBytes: number;
  version: number;
  uploadedByName: string;
  uploadedAt: string;
  _formatted?: { content?: string; originalFileName?: string };
}

const documentService = {

  getAll: () =>
    api.get<DocumentDto[]>('/documents').then(r => r.data),  
  getForMatter: (matterId: string) =>
    api.get<DocumentDto[]>(`/documents/matter/${matterId}`).then(r => r.data),

  getVersionHistory: (docId: string) =>
    api.get<DocumentDto[]>(`/documents/${docId}/versions`).then(r => r.data),
  
  getContent: (docId: string) =>
    api.get<ArrayBuffer>(`/documents/${docId}/content`, { responseType: 'arraybuffer' }).then(r => r.data),

  upload: (matterId: string, file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('matterId', matterId);
    formData.append('file', file);
    return api.post<DocumentDto>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total)
          onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }).then(r => r.data);
  },

  getDownloadUrl: (docId: string) =>
    api.get<{ url: string }>(`/documents/${docId}/download`).then(r => r.data.url),

  search: (query: string) =>
    api.get<DocumentSearchEntry[]>('/documents/search', { params: { q: query } })
       .then(r => r.data),

  delete: (docId: string) =>
    api.delete(`/documents/${docId}`).then(r => r.data),
};

export default documentService;
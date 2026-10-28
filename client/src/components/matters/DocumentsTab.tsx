// src/components/matters/DocumentsTab.tsx
import { useState, useEffect, useRef } from 'react';
import documentService, { DocumentDto } from '../../services/documentService';
import DocumentPreviewPanel from './DocumentPreviewPanel';
import './DocumentsTab.css';

interface Props {
  matterId: string;
  canUpload: boolean;
  canDelete: boolean;
}

function fileIcon(contentType: string): string {
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('image')) return '🖼️';
  if (contentType.includes('word') || contentType.includes('document')) return '📝';
  if (contentType.includes('sheet') || contentType.includes('excel')) return '📊';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DocumentsTab({ matterId, canUpload, canDelete }: Props) {
  const [docs, setDocs]                         = useState<DocumentDto[]>([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [isDragging, setIsDragging]             = useState(false);
  const [uploading, setUploading]               = useState<string | null>(null);
  const [uploadProgress, setUploadProgress]     = useState(0);
  const [expandedVersions, setExpandedVersions] = useState<string | null>(null);
  const [versionHistory, setVersionHistory]     = useState<DocumentDto[]>([]);
  const [error, setError]                       = useState('');
  const [previewDoc, setPreviewDoc]             = useState<DocumentDto | null>(null);
  const fileInputRef                            = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocs(); }, [matterId]);

  const loadDocs = async () => {
    try {
      setIsLoading(true);
      const data = await documentService.getForMatter(matterId);
      // Show only the latest version of each file in the main list
      const latest = Object.values(
        data.reduce((acc, doc) => {
          if (!acc[doc.originalFileName] || doc.version > acc[doc.originalFileName].version)
            acc[doc.originalFileName] = doc;
          return acc;
        }, {} as Record<string, DocumentDto>)
      );
      setDocs(latest);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      setUploading(file.name);
      setUploadProgress(0);
      try {
        await documentService.upload(matterId, file, pct => setUploadProgress(pct));
        await loadDocs();
      } catch {
        setError(`Failed to upload ${file.name}.`);
      }
    }
    setUploading(null);
    setUploadProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDownload = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      setError('Failed to generate download link.');
    }
  };

  const handleDelete = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Delete "${doc.originalFileName}"? This cannot be undone.`)) return;
    try {
      await documentService.delete(doc.id);
      setDocs(docs.filter(d => d.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
    } catch {
      setError('Failed to delete document.');
    }
  };

  const toggleVersionHistory = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (expandedVersions === doc.id) {
      setExpandedVersions(null);
      setVersionHistory([]);
      return;
    }
    try {
      const versions = await documentService.getVersionHistory(doc.id);
      setVersionHistory(versions);
      setExpandedVersions(doc.id);
    } catch {
      setError('Failed to load version history.');
    }
  };

  return (
    <div className="documents-tab">
      {error && (
        <div className="doc-error">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss">✕</button>
        </div>
      )}

      {canUpload && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input ref={fileInputRef} type="file" multiple hidden onChange={e => handleUpload(e.target.files)} />
          {uploading ? (
            <div className="upload-progress">
              <div className="upload-progress-label">Uploading {uploading}… {uploadProgress}%</div>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="drop-zone-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0-12 4 4m-4-4-4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                </svg>
              </div>
              <div className="drop-zone-text">Drop files or <span className="drop-zone-link">browse</span></div>
              <div className="drop-zone-hint">PDF, Word, Excel, images · Max 50MB</div>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="doc-loading">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="doc-empty">
          <p>No documents yet.</p>
          {canUpload && <p className="doc-empty-hint">Upload files using the area above.</p>}
        </div>
      ) : (
        <div className="doc-list">
          {docs.map(doc => (
            <div key={doc.id} className="doc-item">
              <div
                className={`doc-row ${previewDoc?.id === doc.id ? 'doc-row-active' : ''}`}
                onClick={() => setPreviewDoc(doc)}
              >
                <div className="doc-icon">{fileIcon(doc.contentType)}</div>

                <div className="doc-info">
                  <div className="doc-name">{doc.originalFileName}</div>
                  <div className="doc-meta">
                    <span>{formatSize(doc.fileSizeBytes)}</span>
                    <span className="dot">·</span>
                    <span>{doc.uploadedByName}</span>
                    <span className="dot">·</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                    {doc.version > 1 && (
                      <span className="badge badge-gold doc-version-badge">v{doc.version}</span>
                    )}
                  </div>
                </div>

                <div className="doc-actions">
                  {doc.version > 1 && (
                    <button className="doc-icon-btn" title="Version history" onClick={e => toggleVersionHistory(doc, e)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                      </svg>
                    </button>
                  )}
                  <button className="doc-icon-btn" title="Download" onClick={e => handleDownload(doc, e)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />
                    </svg>
                  </button>
                  {canDelete && (
                    <button className="doc-icon-btn doc-icon-btn-danger" title="Delete" onClick={e => handleDelete(doc, e)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V4h6v3m-7 0 1 13h8l1-13" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {expandedVersions === doc.id && versionHistory.length > 0 && (
                <div className="version-history">
                  <div className="version-history-title">Version History</div>
                  {versionHistory.map(v => (
                    <div key={v.id} className="version-row" onClick={() => setPreviewDoc(v)}>
                      <span className="badge badge-gold">v{v.version}</span>
                      <span className="version-info">{formatDate(v.uploadedAt)} · {v.uploadedByName}</span>
                      <span className="version-size">{formatSize(v.fileSizeBytes)}</span>
                      <button className="doc-icon-btn" onClick={e => handleDownload(v, e)} title="Download this version">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <DocumentPreviewPanel
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={() => previewDoc && handleDownload(previewDoc)}
      />
    </div>
  );
}
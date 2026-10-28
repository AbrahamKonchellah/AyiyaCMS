// src/pages/Documents.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import documentService, { DocumentDto, DocumentSearchEntry } from '../services/documentService';
import matterService, { MatterDto } from '../services/matterService';
import DocumentPreviewPanel from '../components/matters/DocumentPreviewPanel';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';
import './Documents.css';

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

function renderHighlighted(text: string) {
  const parts = text.split(/(<mark>|<\/mark>)/g);
  let isMark = false;
  return parts.map((part, i) => {
    if (part === '<mark>') { isMark = true; return null; }
    if (part === '</mark>') { isMark = false; return null; }
    if (!part) return null;
    return isMark
      ? <mark key={i} className="search-highlight">{part}</mark>
      : <span key={i}>{part}</span>;
  });
}

interface DisplayDoc extends DocumentDto {
  excerpt?: string;
}

export default function Documents() {
  const { user } = useAuth();
  const toast    = useToast();
  const confirm  = useConfirm();

  const canUpload = user?.role === 'Admin' || user?.role === 'Partner';
  const canDelete = user?.role === 'Admin' || user?.role === 'Partner';

  const [docs, setDocs]                         = useState<DocumentDto[]>([]);
  const [searchResults, setSearchResults]       = useState<DocumentSearchEntry[] | null>(null);
  const [isSearching, setIsSearching]           = useState(false);
  const [matters, setMatters]                   = useState<MatterDto[]>([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [searchQuery, setSearchQuery]           = useState('');
  const [metaQuery, setMetaQuery]               = useState('');
  const [matterFilter, setMatterFilter]         = useState('');
  const [previewDoc, setPreviewDoc]             = useState<DocumentDto | null>(null);
  const [expandedId, setExpandedId]             = useState<string | null>(null);
  const [versionHistory, setVersionHistory]     = useState<DocumentDto[]>([]);

  const [showUploadModal, setShowUploadModal]   = useState(false);
  const [uploadMatterId, setUploadMatterId]     = useState('');
  const [uploadFile, setUploadFile]             = useState<File | null>(null);
  const [isUploading, setIsUploading]           = useState(false);
  const [uploadProgress, setUploadProgress]     = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadDocs(); loadMatters(); }, []);

  const loadDocs = async () => {
    try {
      setIsLoading(true);
      const data = await documentService.getAll();
      setDocs(data);
    } catch {
      toast.error('Failed to load documents', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatters = async () => {
    try {
      setMatters(await matterService.getAll());
    } catch {
      // Non-fatal
    }
  };

  // Debounced content search — hits Meilisearch via the backend
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults(null); return; }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResults(await documentService.search(trimmed));
      } catch {
        toast.error('Search failed', 'Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const matterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    docs.forEach(d => { if (d.matterId && d.matterTitle) seen.set(d.matterId, d.matterTitle); });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [docs]);

  const displayDocs: DisplayDoc[] = useMemo(() => {
    const base: DisplayDoc[] = searchResults !== null
      ? searchResults.map(hit => ({
          id:               hit.id,
          originalFileName: hit.originalFileName,
          fileKey:          '',
          contentType:      hit.contentType,
          fileSizeBytes:    hit.fileSizeBytes,
          checksum:         '',
          version:          hit.version,
          matterId:         hit.matterId,
          matterTitle:      hit.matterTitle,
          clientName:       hit.clientName,
          uploadedById:     '',
          uploadedByName:   hit.uploadedByName,
          uploadedAt:       hit.uploadedAt,
          excerpt:          hit._formatted?.content,
        }))
      : docs;

    let result = matterFilter ? base.filter(d => d.matterId === matterFilter) : base;

    // Local metadata filter — no API call, since everything it checks
    // (name, client, uploader, date) is already sitting in memory.
    const metaTrimmed = metaQuery.trim().toLowerCase();
    if (metaTrimmed) {
      result = result.filter(d => {
        const haystack = [d.originalFileName, d.clientName, d.uploadedByName, formatDate(d.uploadedAt)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(metaTrimmed);
      });
    }

    return result;
  }, [searchResults, docs, matterFilter, metaQuery]);

  const handleDownload = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed', 'Could not generate a download link.');
    }
  };

  const handleDelete = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = await confirm({
      title:        'Delete Document',
      message:      `"${doc.originalFileName}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant:      'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.delete(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      toast.success('Document deleted', `"${doc.originalFileName}" has been removed.`);
    } catch {
      toast.error('Delete failed', 'Please try again.');
    }
  };

  const toggleVersionHistory = async (doc: DocumentDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (expandedId === doc.id) { setExpandedId(null); setVersionHistory([]); return; }
    try {
      setVersionHistory(await documentService.getVersionHistory(doc.id));
      setExpandedId(doc.id);
    } catch {
      toast.error('Failed to load version history', 'Please try again.');
    }
  };

  const openUploadModal = () => {
    setUploadMatterId('');
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!uploadMatterId) { toast.warning('Select a matter', 'Choose which matter this document belongs to.'); return; }
    if (!uploadFile)     { toast.warning('Select a file', 'Choose a file to upload.'); return; }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      await documentService.upload(uploadMatterId, uploadFile, pct => setUploadProgress(pct));
      toast.success('Document uploaded', `"${uploadFile.name}" was uploaded successfully.`);
      setShowUploadModal(false);
      await loadDocs();
    } catch {
      toast.error('Upload failed', 'Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="documents-page">
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <div className="page-header-meta">
            {docs.length} document{docs.length === 1 ? '' : 's'} across all your matters
          </div>
        </div>
        {canUpload && (
          <button className="btn-primary" onClick={openUploadModal}>Upload Document</button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="search-input"
            placeholder="Search document content…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="search-input-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16l-6 8v6l-4 2v-8L4 4z" />
          </svg>
          <input
            className="search-input"
            placeholder="Filter by name, client, uploader, or date…"
            value={metaQuery}
            onChange={e => setMetaQuery(e.target.value)}
          />
        </div>

        <select className="filter-select" value={matterFilter} onChange={e => setMatterFilter(e.target.value)}>
          <option value="">All matters</option>
          {matterOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Name</th>
              <th>Matter</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Size</th>
              <th style={{ width: 110 }}></th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || isSearching) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}><div className="skeleton-block" style={{ height: 18 }} /></td>
                </tr>
              ))
            ) : displayDocs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                      </svg>
                    </div>
                    <h3>{docs.length === 0 ? 'No documents yet' : 'No matching documents'}</h3>
                    <p>{docs.length === 0 ? 'Documents uploaded to your matters will appear here.' : 'Try a different search or filter.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayDocs.map(doc => (
                <React.Fragment key={doc.id}>
                  <tr onClick={() => setPreviewDoc(doc)}>
                    <td className="doc-icon-cell">{fileIcon(doc.contentType)}</td>
                    <td>
                      <span className="doc-name-cell">{doc.originalFileName}</span>
                      {doc.version > 1 && (
                        <span className="badge badge-gold" style={{ marginLeft: 8 }}>v{doc.version}</span>
                      )}
                      {doc.excerpt && (
                        <div className="search-excerpt">{renderHighlighted(doc.excerpt)}</div>
                      )}
                    </td>
                    <td>
                      {doc.matterId ? (
                        <>
                          <Link to={`/matters/${doc.matterId}`} onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--green-700)', textDecoration: 'none' }}>
                            {doc.matterTitle}
                          </Link>
                          {doc.clientName && <div className="matter-client-sub">{doc.clientName}</div>}
                        </>
                      ) : '—'}
                    </td>
                    <td>{doc.uploadedByName}</td>
                    <td>{formatDate(doc.uploadedAt)}</td>
                    <td>{formatSize(doc.fileSizeBytes)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions">
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
                    </td>
                  </tr>
                  {expandedId === doc.id && versionHistory.length > 0 && (
                    <tr>
                      <td colSpan={7}>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DocumentPreviewPanel
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={() => previewDoc && handleDownload(previewDoc)}
      />

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Upload Document</h2>
            <p className="modal-sub">Choose which matter this document belongs to, then select a file.</p>

            <div className="form-group">
              <label>Matter *</label>
              <select value={uploadMatterId} onChange={e => setUploadMatterId(e.target.value)} disabled={isUploading}>
                <option value="">Select a matter…</option>
                {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>File *</label>
              <div
                className={`upload-dropzone ${uploadFile ? 'has-file' : ''}`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {isUploading ? (
                  <div className="upload-progress">
                    <div className="upload-progress-label">Uploading… {uploadProgress}%</div>
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : uploadFile ? (
                  <span>📎 {uploadFile.name}</span>
                ) : (
                  <span>Click to choose a file · Max 50MB</span>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowUploadModal(false)} disabled={isUploading}>Cancel</button>
              <button className="btn-primary" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// src/components/matters/DocumentPreviewPanel.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import documentService, { DocumentDto } from '../../services/documentService';
import './DocumentPreviewPanel.css';

interface Props {
  doc: DocumentDto | null;
  onClose: () => void;
  onDownload: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DocumentPreviewPanel({ doc, onClose, onDownload }: Props) {
  const [url, setUrl]           = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState('');

  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError]     = useState('');
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const isOpen  = !!doc;
  const isPdf   = doc?.contentType.includes('pdf') ?? false;
  const isImage = doc?.contentType.startsWith('image/') ?? false;
  const isDocx  = !!doc && (
    doc.contentType.includes('wordprocessingml') ||
    doc.originalFileName.toLowerCase().endsWith('.docx')
  );

  // PDF / image — still via presigned URL. <iframe>/<img> load cross-origin
  // resources fine without CORS, so this path is unaffected by Step 4 below.
  useEffect(() => {
    if (!doc || isDocx) { setUrl(null); setLoading(false); return; }
    setLoading(true);
    setError('');
    setUrl(null);
    documentService.getDownloadUrl(doc.id)
      .then(setUrl)
      .catch(() => setError('Could not load this document.'))
      .finally(() => setLoading(false));
  }, [doc?.id, isDocx]);

  // Word docs — raw bytes via our own API (see why in Step 2/3 above),
  // rendered into a plain DOM container since docx-preview manages its
  // own markup directly rather than returning React-friendly output.
  useEffect(() => {
    if (!doc || !isDocx || !docxContainerRef.current) return;

    let cancelled = false;
    setDocxLoading(true);
    setDocxError('');
    docxContainerRef.current.innerHTML = '';

    documentService.getContent(doc.id)
      .then(buffer => {
        if (cancelled || !docxContainerRef.current) return;
        return renderAsync(buffer, docxContainerRef.current, undefined, {
          ignoreWidth: true,   // let content flow to the panel's width instead
          ignoreHeight: true,  // of a fixed A4/Letter pixel size that would
          breakPages: false,   // overflow this narrow side panel
          inWrapper: true,
        });
      })
      .catch(() => { if (!cancelled) setDocxError('Could not preview this document.'); })
      .finally(() => { if (!cancelled) setDocxLoading(false); });

    return () => { cancelled = true; };
  }, [doc?.id, isDocx]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!doc) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, handleKeyDown]);

  return (
    <>
      <div className={`preview-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`preview-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        {doc && (
          <>
            <div className="preview-header">
              <div className="preview-header-title">
                <span className="preview-icon">{isPdf ? '📄' : isImage ? '🖼️' : isDocx ? '📝' : '📎'}</span>
                <span className="preview-name" title={doc.originalFileName}>{doc.originalFileName}</span>
              </div>
              <button className="preview-close" onClick={onClose} aria-label="Close preview">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="preview-body">
              {isLoading && <div className="preview-state">Loading preview…</div>}
              {error && <div className="preview-state preview-state-error">{error}</div>}

              {!isLoading && !error && url && isPdf && (
                <iframe src={url} title={doc.originalFileName} className="preview-frame" />
              )}

              {!isLoading && !error && url && isImage && (
                <div className="preview-image-wrap">
                  <img src={url} alt={doc.originalFileName} className="preview-image" />
                </div>
              )}

              {!isLoading && !error && isDocx && (
                <div className="preview-docx-outer">
                  {docxLoading && <div className="preview-state">Rendering document…</div>}
                  {docxError && <div className="preview-state preview-state-error">{docxError}</div>}
                  <div ref={docxContainerRef} className="preview-docx-container" />
                </div>
              )}

              {!isLoading && !error && url && !isPdf && !isImage && !isDocx && (
                <div className="preview-state preview-fallback">
                  <div className="preview-fallback-icon">📎</div>
                  <p>Preview isn't available for this file type.</p>
                  <button className="btn-primary" onClick={onDownload}>Download to view</button>
                </div>
              )}
            </div>

            <div className="preview-footer">
              <div className="preview-meta">
                <div className="preview-meta-row"><span>Uploaded by</span><strong>{doc.uploadedByName}</strong></div>
                <div className="preview-meta-row"><span>Date</span><strong>{formatDate(doc.uploadedAt)}</strong></div>
                <div className="preview-meta-row"><span>Size</span><strong>{formatSize(doc.fileSizeBytes)}</strong></div>
                {doc.version > 1 && (
                  <div className="preview-meta-row"><span>Version</span><strong>v{doc.version}</strong></div>
                )}
              </div>
              <button className="btn-secondary preview-download-btn" onClick={onDownload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" />
                </svg>
                Download
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
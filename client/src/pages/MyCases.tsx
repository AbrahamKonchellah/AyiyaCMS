// src/pages/MyCases.tsx
import { useState, useEffect } from 'react';
import clientDashboardService, {
  ClientMatter,
  ClientDocument,
} from '../services/clientDashboardService';
import { useToast } from '../components/auth/Toast';
import './ClientDashboard.css';
import matterNoteService, { MatterNote } from '../services/MatterNoteService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function hearingUrgency(iso: string): 'soon' | 'upcoming' {
  const days = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / 86400000
  );
  return days <= 3 ? 'soon' : 'upcoming';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(contentType: string): string {
  if (contentType.includes('pdf'))   return '📄';
  if (contentType.includes('image')) return '🖼️';
  if (contentType.includes('word') || contentType.includes('document')) return '📝';
  if (contentType.includes('sheet') || contentType.includes('excel'))   return '📊';
  return '📎';
}

const STATUS_FILTERS = ['All', 'Active', 'Closed', 'Pending'];

// ── Document row ──────────────────────────────────────
function DocumentRow({ doc }: { doc: ClientDocument }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await clientDashboardService.getDocumentDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed', 'Could not download the document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="client-doc-row">
      <span className="client-doc-icon">{fileIcon(doc.contentType)}</span>
      <div className="client-doc-info">
        <div className="client-doc-name">{doc.originalFileName}</div>
        <div className="client-doc-meta">
          {formatFileSize(doc.fileSizeBytes)} · {formatDate(doc.uploadedAt)}
          {doc.version > 1 && <span className="client-doc-version">v{doc.version}</span>}
        </div>
      </div>
      <button
        className="client-doc-download"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        )}
        {downloading ? 'Opening…' : 'Download'}
      </button>
    </div>
  );
}
function ClientNotesPanel({ matterId }: { matterId: string }) {
  const toast = useToast();
  const [notes, setNotes]       = useState<MatterNote[]>([]);
  const [loading, setLoading]   = useState(true);
  const [content, setContent]   = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    matterNoteService.getClientNotes(matterId)
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matterId]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const note = await matterNoteService.createClientNote(matterId, content.trim());
      setNotes(prev => [...prev, note]);
      setContent('');
      toast.success('Message sent', 'Your lawyer will be notified.');
    } catch {
      toast.error('Failed to send message', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="client-docs-panel">
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-soft)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 10,
      }}>
        Messages
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Loading…</div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 12 }}>
          No messages yet. Send one below.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {notes.map(note => {
            const isClient = note.authorRole === 'Client';
            return (
              <div key={note.id} style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: isClient ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  background: isClient ? 'var(--accent)' : 'var(--surface)',
                  color: isClient ? '#fff' : 'var(--text-primary)',
                  border: `1px solid ${isClient ? 'transparent' : 'var(--border)'}`,
                  borderRadius: isClient ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '8px 12px',
                  fontSize: 13,
                }}>
                  {!isClient && (
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--accent)', marginBottom: 3,
                    }}>
                      {note.authorName}
                    </div>
                  )}
                  <div style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </div>
                  <div style={{
                    fontSize: 10, marginTop: 4,
                    color: isClient ? 'rgba(255,255,255,0.7)' : 'var(--text-soft)',
                    textAlign: 'right',
                  }}>
                    {new Date(note.createdAt).toLocaleTimeString('en-KE', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a message to your lawyer…"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 7,
            border: '1px solid var(--border)',
            background: 'var(--bg, #fff)',
            color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          style={{
            padding: '7px 14px', borderRadius: 7,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 600,
            cursor: sending || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !content.trim() ? 0.6 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
// ── Matter card with expandable documents ─────────────
function MatterCard({ matter }: { matter: ClientMatter }) {
  const [expanded, setExpanded]     = useState(false);
  const [docs, setDocs]             = useState<ClientDocument[] | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && docs === null) {
      setLoadingDocs(true);
      try {
        const data = await clientDashboardService.getMatterDocuments(matter.id);
        setDocs(data);
      } catch {
        setDocs([]);
      } finally {
        setLoadingDocs(false);
      }
    }
  };

  return (
    <div className="matter-item">
      <div className="matter-item-header">
        <div className="matter-title">{matter.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span className={`matter-status-badge ${matter.status.toLowerCase()}`}>
    {matter.status}
  </span>
  <button
    onClick={handleExpand}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--text-secondary)', padding: '2px 4px',
      fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="m19 9-7 7-7-7" />
    </svg>
    Docs & Messages
     </button>
     </div>
      </div>

      <div className="matter-meta">
        {matter.jicmsCaseNumber && (
          <span className="matter-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
            </svg>
            {matter.jicmsCaseNumber}
          </span>
        )}
        {matter.courtStation && (
          <span className="matter-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {matter.courtStation}
          </span>
        )}
        {matter.assignedLawyerName && (
          <span className="matter-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
            {matter.assignedLawyerName}
          </span>
        )}
      </div>

      {matter.hearingDate && (
        <div className={`matter-hearing ${hearingUrgency(matter.hearingDate)}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5" />
          </svg>
          Hearing: {formatDate(matter.hearingDate)}
        </div>
      )}

      {matter.filingDeadline && (
        <div className="matter-hearing upcoming">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Filing Deadline: {formatDate(matter.filingDeadline)}
        </div>
      )}
         <ClientNotesPanel matterId={matter.id} />
      {/* ── Documents panel ── */}
      {expanded && (
        <div className="client-docs-panel">
          {loadingDocs ? (
            <div className="empty-state" style={{ padding: '12px 0' }}>Loading documents…</div>
          ) : !docs || docs.length === 0 ? (
            <div className="empty-state" style={{ padding: '12px 0' }}>No documents on this case yet.</div>
          ) : (
            docs.map(doc => <DocumentRow key={doc.id} doc={doc} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────
export default function MyCases() {
  const [matters, setMatters] = useState<ClientMatter[] | null>(null);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    clientDashboardService.getAllMatters()
      .then(setMatters)
      .catch(() => setError('Failed to load your cases. Please try again.'));
  }, []);

  const filtered = (matters ?? []).filter(m => {
    const matchesStatus = filter === 'All' || m.status === filter;
    const matchesSearch = search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.jicmsCaseNumber?.toLowerCase().includes(search.toLowerCase()) ||
      m.courtStation?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="client-dashboard">

      <div className="dashboard-heading">
        <h1>My Cases</h1>
        <p>All matters linked to your account</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by title, case number, court…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 220, padding: '8px 12px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-primary)',
            fontSize: 14,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13,
                fontWeight: filter === s ? 600 : 400,
                border: '1px solid var(--border)',
                background: filter === s ? 'var(--accent)' : 'var(--surface)',
                color: filter === s ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="matter-list">
          {!matters ? (
            <div className="empty-state">Loading your cases…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No cases match your search.</div>
          ) : (
            filtered.map(m => <MatterCard key={m.id} matter={m} />)
          )}
        </div>
      </div>
    </div>
  );
}
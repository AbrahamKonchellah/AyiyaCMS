import { useState, useEffect, useRef } from 'react';
import matterNoteService, { MatterNote } from '../../services/MatterNoteService';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../auth/Toast';
import { useConfirm } from '../auth/ConfirmDialog';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isClient = visibility === 'Client';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em',
      background: isClient ? 'rgba(212,168,83,0.15)' : 'rgba(0,0,0,0.06)',
      color: isClient ? '#92620A' : 'var(--text-soft)',
      border: `1px solid ${isClient ? 'rgba(212,168,83,0.3)' : 'var(--border)'}`,
    }}>
      {isClient ? 'Client visible' : 'Internal'}
    </span>
  );
}

export default function NotesTab({ matterId }: { matterId: string }) {
  const { user }  = useAuth();
  const toast     = useToast();
  const confirm   = useConfirm();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes]         = useState<MatterNote[]>([]);
  const [loading, setLoading]     = useState(true);
  const [content, setContent]     = useState('');
  const [visibility, setVisibility] = useState<'Internal' | 'Client'>('Internal');
  const [replyTo, setReplyTo]     = useState<MatterNote | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === 'Admin' || user?.role === 'Partner';

  useEffect(() => {
    matterNoteService.getNotes(matterId)
      .then(setNotes)
      .catch(() => toast.error('Failed to load notes', 'Please try again.'))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const note = await matterNoteService.createNote(matterId, {
        content: content.trim(),
        visibility,
        parentNoteId: replyTo?.id ?? null,
      });
      setNotes(prev => [...prev, note]);
      setContent('');
      setReplyTo(null);
    } catch {
      toast.error('Failed to post note', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (note: MatterNote) => {
    const confirmed = await confirm({
      title: 'Delete note',
      message: 'This note will be permanently deleted.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await matterNoteService.deleteNote(matterId, note.id);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      toast.success('Note deleted', '');
    } catch {
      toast.error('Failed to delete note', 'Please try again.');
    }
  };

  // Group: top-level notes with their replies
  const topLevel = notes.filter(n => !n.parentNoteId);
  const replies  = (parentId: string) => notes.filter(n => n.parentNoteId === parentId);

  const renderNote = (note: MatterNote, isReply = false) => {
    const isOwn      = note.authorId === user?.id;
    const isClient   = note.authorRole === 'Client';
    const canDelete  = isOwn || canManage;

    return (
      <div key={note.id} style={{
        marginLeft: isReply ? 32 : 0,
        marginBottom: 12,
      }}>
        <div style={{
          background: isClient ? 'rgba(212,168,83,0.06)' : 'var(--surface)',
          border: `1px solid ${isClient ? 'rgba(212,168,83,0.2)' : 'var(--border)'}`,
          borderRadius: 8,
          padding: '12px 14px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{note.authorName}</span>
              {isClient && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 999, background: 'rgba(212,168,83,0.2)',
                  color: '#92620A',
                }}>CLIENT</span>
              )}
              <VisibilityBadge visibility={note.visibility} />
              <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                {formatDateTime(note.createdAt)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {!isReply && (
                <button
                  onClick={() => setReplyTo(note)}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 11, color: 'var(--accent)',
                    cursor: 'pointer', padding: '2px 6px',
                  }}
                >
                  Reply
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(note)}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 11, color: 'var(--text-soft)',
                    cursor: 'pointer', padding: '2px 6px',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          <p style={{
            margin: 0, fontSize: 13.5,
            color: 'var(--text-primary)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {note.content}
          </p>
        </div>
        {replies(note.id).map(r => renderNote(r, true))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Notes list ── */}
      <div style={{ minHeight: 120, marginBottom: 20 }}>
        {loading ? (
          <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>Loading notes…</div>
        ) : topLevel.length === 0 ? (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            color: 'var(--text-soft)', fontSize: 13,
          }}>
            No notes yet. Add the first one below.
          </div>
        ) : (
          topLevel.map(n => renderNote(n))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: 14,
      }}>
        {replyTo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)',
            borderRadius: 6, padding: '6px 10px', marginBottom: 10,
            fontSize: 12, color: '#92620A',
          }}>
            <span>Replying to <strong>{replyTo.authorName}</strong></span>
            <button
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92620A' }}
            >✕</button>
          </div>
        )}

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          style={{
            width: '100%', resize: 'vertical',
            padding: '8px 10px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg, #fff)',
            color: 'var(--text-primary)',
            fontSize: 13.5, fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />

        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 10,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600 }}>
              Visibility:
            </label>
            {(['Internal', 'Client'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12,
                  fontWeight: visibility === v ? 600 : 400,
                  border: '1px solid var(--border)',
                  background: visibility === v
                    ? (v === 'Client' ? 'rgba(212,168,83,0.2)' : 'var(--accent)')
                    : 'var(--surface)',
                  color: visibility === v
                    ? (v === 'Client' ? '#92620A' : '#fff')
                    : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {v === 'Client' ? 'Client visible' : 'Internal only'}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            style={{
              padding: '7px 20px', borderRadius: 7,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !content.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? 'Posting…' : 'Post Note'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 6 }}>
          Ctrl+Enter to post quickly
        </div>
      </div>
    </div>
  );
}
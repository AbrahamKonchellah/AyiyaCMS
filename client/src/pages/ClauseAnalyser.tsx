// src/pages/ClauseAnalyser.tsx
import { useEffect, useMemo, useState } from 'react';
import mlService, { AnalysisResult, DateFinding, DateKind } from '../services/mlService';
import documentService, { DocumentDto } from '../services/documentService';
import calendarService from '../services/calendarService';
import { useToast } from '../components/auth/Toast';
import './phase4.css';
import './ClauseAnalyser.css';

// ── Helpers ───────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function inDays(n: number): Date { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function longDate(d: Date): string { return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function showDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-KE',
    { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

const KIND_LABEL: Record<DateKind, string> = {
  court_date: 'Court date', deadline: 'Deadline', date: 'Date mentioned',
};

// Sample inputs. Court dates are generated relative to today so the demo always shows future dates.
const SAMPLES: { label: string; build: () => string }[] = [
  {
    label: 'Contract clauses',
    build: () => `1. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya, and the parties submit to the exclusive jurisdiction of the courts of Kenya.

2. NOTICES
Any notice required or permitted under this Agreement shall be in writing and shall be delivered by hand or sent by registered post to the address of the receiving party stated in this Agreement.

3. SEVERABILITY
If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

4. COUNTERPARTS
This Agreement may be executed in any number of counterparts, each of which shall be deemed an original, and all of which together shall constitute one and the same instrument.`,
  },
  {
    label: 'Court directions',
    build: () => `RULING
1. The Defendant shall file and serve its statement of defence within 14 days of service of this order.
2. The Plaintiff shall file and serve written submissions within 21 days from the date of this ruling.
3. The matter be mentioned on ${longDate(inDays(35))} for directions.
4. Ruling on the application shall be delivered on ${longDate(inDays(60))}.
5. The Applicant filed the application on 5th March 2025, and the earlier ruling was delivered on 2nd October 2024.`,
  },
];

function highlight(sentence: string, match: string) {
  const i = sentence.indexOf(match);
  if (i < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, i)}
      <mark className="ca-mark">{match}</mark>
      {sentence.slice(i + match.length)}
    </>
  );
}

// ── Page ──────────────────────────────────────────────
export default function ClauseAnalyser() {
  const toast = useToast();

  const [mode, setMode]               = useState<'text' | 'document'>('text');
  const [text, setText]               = useState('');
  const [docs, setDocs]               = useState<DocumentDto[]>([]);
  const [docId, setDocId]             = useState('');
  const [referenceDate, setReference] = useState(todayIso());
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [added, setAdded]             = useState<Set<string>>(new Set());

  useEffect(() => {
    documentService.getAll()
      .then(all => setDocs(all.filter(d =>
        d.contentType.includes('pdf') || d.contentType.includes('word') ||
        d.originalFileName.toLowerCase().endsWith('.docx'))))
      .catch(() => { /* the document tab simply stays empty */ });
  }, []);

  const selectedDoc = docs.find(d => d.id === docId) ?? null;

  const analyse = async () => {
    setError(null);
    setResult(null);
    setAdded(new Set());
    setLoading(true);
    try {
      const data = mode === 'text'
        ? await mlService.analyzeText(text, referenceDate)
        : await mlService.analyzeDocument(docId, referenceDate);
      setResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'The analysis could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const proposals = useMemo(
    () => result?.dates.filter(d => d.status === 'propose' || d.status === 'needs_anchor') ?? [], [result]);
  const others = useMemo(
    () => result?.dates.filter(d => d.status !== 'propose' && d.status !== 'needs_anchor') ?? [], [result]);

  const addToCalendar = async (f: DateFinding, key: string) => {
    if (!f.dueDate) return;
    try {
      await calendarService.createEvent({
        title: `${KIND_LABEL[f.kind]}: ${f.sentence.replace(/^\s*(\d+\.|\([a-z]\))\s*/i, '').slice(0, 90)}`,
        description: `Proposed by the Clause Analyser from: "${f.sentence}"`,
        startAt: new Date(f.dueDate).toISOString(),
        isAllDay: true,
        color: f.kind === 'deadline' ? '#B91C1C' : '#1A5C52',
        matterId: mode === 'document' ? selectedDoc?.matterId ?? null : null,
        reminders: [],
      });
      setAdded(prev => new Set(prev).add(key));
      toast.success('Added to calendar', `${showDate(f.dueDate)}`);
    } catch {
      toast.error('Could not add to calendar', 'Please try again.');
    }
  };

  const canAnalyse = mode === 'text' ? text.trim().length > 0 : docId !== '';

  return (
    <div className="clause-analyser-page">
      <div className="page-header">
        <div>
          <h1>Clause Analyser</h1>
          <div className="page-header-meta">
            Identify clause types and pick out court dates and deadlines from a document.
          </div>
        </div>
      </div>

      {/* ── Input ── */}
      <div className="ca-card">
        <div className="ca-tabs">
          <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Paste text</button>
          <button className={mode === 'document' ? 'active' : ''} onClick={() => setMode('document')}>From a document</button>
        </div>

        {mode === 'text' ? (
          <>
            <div className="form-group">
              <label>Clause or document text</label>
              <textarea rows={9} value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste a clause, an order, or a section of a document…" />
            </div>
            <div className="ca-samples">
              <span>Try a sample:</span>
              {SAMPLES.map(s => (
                <button key={s.label} className="btn-ghost" onClick={() => setText(s.build())}>{s.label}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="form-group">
            <label>Document</label>
            <select value={docId} onChange={e => setDocId(e.target.value)}>
              <option value="">Choose a PDF or Word document…</option>
              {docs.map(d => (
                <option key={d.id} value={d.id}>
                  {d.originalFileName} — {d.matterTitle ?? 'No matter'}
                </option>
              ))}
            </select>
            <div className="ca-hint">Scanned PDFs are not supported yet. Use text-based PDFs or Word files.</div>
          </div>
        )}

        <div className="ca-actions">
          <div className="form-group ca-ref">
            <label>Document / ruling date</label>
            <input type="date" value={referenceDate} onChange={e => setReference(e.target.value)} />
            <div className="ca-hint">Used to turn “within 14 days” into a due date.</div>
          </div>
          <button className="btn-primary" onClick={analyse} disabled={!canAnalyse || loading}>
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
      </div>

      {error && <div className="ca-error">{error}</div>}

      {/* ── Results ── */}
      {result && (
        <>
          <div className="ca-summary">
            <strong>{result.clauses.length}</strong> clause{result.clauses.length === 1 ? '' : 's'} classified ·{' '}
            <strong>{proposals.length}</strong> date{proposals.length === 1 ? '' : 's'} to review ·{' '}
            {result.elapsedMs} ms · {result.model.name} ({result.model.classes} clause types)
          </div>

          <h2 className="ca-h2">Dates and deadlines</h2>
          {proposals.length === 0 && (
            <div className="ca-empty">No upcoming court dates or deadlines were found.</div>
          )}
          {proposals.map((f, i) => {
            const key = `${i}-${f.matchText}`;
            return (
              <div className="ca-card ca-date" key={key}>
                <div className="ca-date-head">
                  <span className={`badge ${f.kind === 'deadline' ? 'badge-red' : 'badge-active'}`}>
                    {KIND_LABEL[f.kind]}
                  </span>
                  {f.status === 'needs_anchor'
                    ? <span className="badge badge-gold">Needs an anchor date</span>
                    : <strong className="ca-due">{f.dueDate && showDate(f.dueDate)}</strong>}
                </div>
                <div className="ca-sentence">{highlight(f.sentence, f.matchText)}</div>
                <div className="ca-date-foot">
                  <span>
                    {f.period && <>Period: {f.period.amount} {f.period.unit}{f.period.amount === 1 ? '' : 's'} · </>}
                    {f.anchorType === 'implied' && <>Counted from the date of the order (assumed). </>}
                    {f.anchorType === 'ruling' && <>Counted from the ruling date. </>}
                    {f.status === 'needs_anchor' && <>Runs from “{f.anchorText}”: set the date once known. </>}
                  </span>
                  {f.status === 'propose' && (
                    added.has(key)
                      ? <span className="ca-added">✓ Added</span>
                      : <button className="btn-secondary" onClick={() => addToCalendar(f, key)}>Add to calendar</button>)}
                </div>
              </div>
            );
          })}

          {others.length > 0 && (
            <details className="ca-others">
              <summary>{others.length} other date{others.length === 1 ? '' : 's'} mentioned (not proposed)</summary>
              {others.map((f, i) => (
                <div className="ca-sentence ca-muted" key={i}>
                  {highlight(f.sentence, f.matchText)}
                  <span className="badge badge-closed">{f.status === 'past' ? 'In the past' : 'Reference only'}</span>
                </div>
              ))}
            </details>
          )}

          <h2 className="ca-h2">Clause types</h2>
          {result.clauses.length === 0 && <div className="ca-empty">No clause-sized text was found.</div>}
          {result.clauses.map(c => {
            const top = c.predictions[0];
            return (
              <div className="ca-card ca-clause" key={c.index}>
                <div className="ca-clause-head">
                  <div className="ca-label">{top.label}</div>
                  <div className="ca-pct">{Math.round(top.probability * 100)}%</div>
                </div>
                <div className="ca-bar"><div className={`ca-bar-fill ca-${c.confidence}`}
                  style={{ width: `${Math.max(2, top.probability * 100)}%` }} /></div>

                <div className="ca-alts">
                  {c.predictions.slice(1).map(p => (
                    <span key={p.label}>{p.label} {Math.round(p.probability * 100)}%</span>
                  ))}
                </div>

                {c.evidence.length > 0 && (
                  <div className="ca-evidence">
                    <span>Why:</span>
                    {c.evidence.map(e => <span className="ca-chip" key={e.term}>{e.term}</span>)}
                  </div>
                )}

                {c.confidence === 'low' && (
                  <div className="ca-warn">
                    Low confidence. This text may not be a standard contract clause, so please review it.
                  </div>
                )}
                <details className="ca-text">
                  <summary>Show text</summary>
                  <p>{c.text}</p>
                </details>
              </div>
            );
          })}

          <div className="ca-footnote">
            The clause type comes from a model trained on US commercial contracts. Dates are found with
            rules, not learned. Always confirm dates against the source document.
          </div>
        </>
      )}
    </div>
  );
}

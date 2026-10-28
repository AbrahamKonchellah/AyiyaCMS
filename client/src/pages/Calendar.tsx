import { useState, useEffect, useMemo, useRef } from 'react';
import calendarService, {
  CalendarFeedItem,
  CalendarEventDto,
  UserTaskDto,
  RECURRENCE_PRESETS,
} from '../services/calendarService';
import matterService, { MatterDto } from '../services/matterService';
import clientService, { LawyerOption } from '../services/clientService';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../components/auth/Toast';
import { useConfirm } from '../components/auth/ConfirmDialog';
import './Phase4.css';
import './Calendar.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EVENT_COLORS = [
  { label: 'Green',  value: '#1A5C52' },
  { label: 'Gold',   value: '#D4A853' },
  { label: 'Red',    value: '#B91C1C' },
  { label: 'Blue',   value: '#1D4ED8' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Gray',   value: '#6B7280' },
];

function typeIcon(kind: CalendarFeedItem['kind']): string {
  switch (kind) {
    case 'Hearing': return '⚖';
    case 'Filing':  return '📋';
    case 'Event':   return '📅';
    case 'Task':    return '✓';
    default:        return '•';
  }
}

function urgencyClass(dateStr: string, color: string): string {
  if (color === '#B91C1C') return 'event-red';
  if (color === '#D4A853') return 'event-amber';
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diff <= 48)  return 'event-red';
  if (diff <= 168) return 'event-amber';
  return 'event-green';
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowPlusHour(): string {
  const d = new Date(Date.now() + 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ── Custom RRULE builder ───────────────────────────────
interface CustomRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byDay: string[];
}

function buildRRule(custom: CustomRRule): string {
  let rule = `FREQ=${custom.freq};INTERVAL=${custom.interval}`;
  if (custom.freq === 'WEEKLY' && custom.byDay.length > 0)
    rule += `;BYDAY=${custom.byDay.join(',')}`;
  return rule;
}

const WEEKDAYS = [
  { label: 'Mo', value: 'MO' },
  { label: 'Tu', value: 'TU' },
  { label: 'We', value: 'WE' },
  { label: 'Th', value: 'TH' },
  { label: 'Fr', value: 'FR' },
  { label: 'Sa', value: 'SA' },
  { label: 'Su', value: 'SU' },
];

function CustomRRuleBuilder({ value, onChange }: {
  value: CustomRRule;
  onChange: (v: CustomRRule) => void;
}) {
  const toggleDay = (day: string) => {
    const next = value.byDay.includes(day)
      ? value.byDay.filter(d => d !== day)
      : [...value.byDay, day];
    onChange({ ...value, byDay: next });
  };

  return (
    <div className="cal-custom-rrule">
      <div className="form-row" style={{ gap: 8 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Frequency</label>
          <select value={value.freq} onChange={e => onChange({ ...value, freq: e.target.value as CustomRRule['freq'] })}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Every</label>
          <input type="number" min={1} max={99} value={value.interval}
            onChange={e => onChange({ ...value, interval: Math.max(1, parseInt(e.target.value) || 1) })} />
        </div>
      </div>
      {value.freq === 'WEEKLY' && (
        <div className="form-group">
          <label>On days</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map(d => (
              <button key={d.value} type="button"
                className={value.byDay.includes(d.value) ? 'cal-day-btn active' : 'cal-day-btn'}
                onClick={() => toggleDay(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>
        Rule: <code>{buildRRule(value)}</code>
      </div>
    </div>
  );
}

// ── Popover detail state ───────────────────────────────
type PopoverDetail =
  | { kind: 'loading';  feedItem: CalendarFeedItem }
  | { kind: 'readonly'; feedItem: CalendarFeedItem }
  | { kind: 'event';    feedItem: CalendarFeedItem; full: CalendarEventDto }
  | { kind: 'task';     feedItem: CalendarFeedItem; full: UserTaskDto };

// ── Detail popover ─────────────────────────────────────
function DetailPopover({ detail, onClose, onEdit, onDelete }: {
  detail: PopoverDetail;
  onClose: () => void;
  onEdit: (item: CalendarFeedItem) => void;
  onDelete: (item: CalendarFeedItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const item = detail.feedItem;

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const isReadOnly = item.kind === 'Hearing' || item.kind === 'Filing';

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div className="cal-popover-row">
        <span className="cal-popover-label">{label}</span>
        <span>{value}</span>
      </div>
    ) : null;

  return (
    <div className="cal-popover-overlay">
      <div className="cal-popover" ref={ref}>
        <div className="cal-popover-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{typeIcon(item.kind)}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{item.kind}</div>
            </div>
          </div>
          <button className="cal-popover-close" onClick={onClose}>✕</button>
        </div>

        <div className="cal-popover-body">
          {detail.kind === 'loading' && (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-soft)', fontSize: 13 }}>
              Loading…
            </div>
          )}

          {detail.kind === 'event' && (
            <>
              <Row label="Matter"   value={detail.full.matterTitle} />
              <Row label="Location" value={detail.full.location} />
              <div className="cal-popover-row">
                <span className="cal-popover-label">Start</span>
                <span>{new Date(detail.full.startAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              {detail.full.endAt && (
                <div className="cal-popover-row">
                  <span className="cal-popover-label">End</span>
                  <span>{new Date(detail.full.endAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              )}
              {detail.full.description && (
                <div className="cal-popover-row" style={{ alignItems: 'flex-start' }}>
                  <span className="cal-popover-label">Notes</span>
                  <span style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{detail.full.description}</span>
                </div>
              )}
              {detail.full.recurrenceRule && (
                <div className="cal-popover-row">
                  <span className="cal-popover-label">Repeats</span>
                  <span style={{ fontSize: 11 }}>{detail.full.recurrenceRule}</span>
                </div>
              )}
              <Row label="Created by" value={detail.full.createdByName} />
            </>
          )}

          {detail.kind === 'task' && (
            <>
              <Row label="Matter" value={detail.full.matterTitle} />
              <div className="cal-popover-row">
                <span className="cal-popover-label">Due</span>
                <span>{new Date(detail.full.dueDate).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</span>
              </div>
              <Row label="Priority"    value={detail.full.priority} />
              <Row label="Assigned to" value={detail.full.assignedToName} />
              {detail.full.assignedByName && (
                <Row label="Assigned by" value={detail.full.assignedByName} />
              )}
              {detail.full.description && (
                <div className="cal-popover-row" style={{ alignItems: 'flex-start' }}>
                  <span className="cal-popover-label">Notes</span>
                  <span style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{detail.full.description}</span>
                </div>
              )}
              {detail.full.isCompleted && (
                <div style={{ marginTop: 8, color: 'var(--green-700)', fontSize: 12, fontWeight: 600 }}>
                  ✓ Completed
                  {detail.full.completedAt
                    ? ' · ' + new Date(detail.full.completedAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })
                    : ''}
                </div>
              )}
            </>
          )}

          {detail.kind === 'readonly' && (
            <>
              <Row label="Matter" value={item.matterTitle} />
              <Row label="Client" value={item.clientName} />
              <div className="cal-popover-row">
                <span className="cal-popover-label">Date</span>
                <span>{new Date(item.date).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </>
          )}
        </div>

        {!isReadOnly && detail.kind !== 'loading' && (
          <div className="cal-popover-actions">
            <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => onEdit(item)}>Edit</button>
            <button className="btn-danger"    style={{ fontSize: 12 }} onClick={() => onDelete(item)}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event modal ────────────────────────────────────────
interface EventForm {
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  color: string;
  recurrencePreset: string;
  customRRule: CustomRRule;
  matterId: string;
  reminders: { message: string; remindAt: string }[];
}

function EventModal({ initial, matters, onSave, onClose, isSaving }: {
  initial?: CalendarEventDto;
  matters: MatterDto[];
  onSave: (f: EventForm) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EventForm>({
    title:            initial?.title ?? '',
    description:      initial?.description ?? '',
    location:         initial?.location ?? '',
    startAt:          initial ? toLocalDatetimeInput(initial.startAt) : nowPlusHour(),
    endAt:            initial?.endAt ? toLocalDatetimeInput(initial.endAt) : '',
    isAllDay:         initial?.isAllDay ?? false,
    color:            initial?.color ?? '#1A5C52',
    recurrencePreset: initial?.recurrenceRule
      ? (RECURRENCE_PRESETS.find(p => p.value === initial.recurrenceRule)?.value ?? 'CUSTOM')
      : '',
    customRRule: { freq: 'WEEKLY', interval: 1, byDay: [] },
    matterId:    initial?.matterId ?? '',
    reminders:   [],
  });

  const rrule = form.recurrencePreset === 'CUSTOM' ? buildRRule(form.customRRule) : form.recurrencePreset;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2>{initial ? 'Edit Event' : 'New Event'}</h2>
        <div className="form-group">
          <label>Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client meeting" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Room, court, Zoom link…" />
          </div>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label>All day</label>
            <input
              type="checkbox"
              checked={form.isAllDay}
              onChange={e => {
                const allDay = e.target.checked;
                setForm(f => ({
                  ...f,
                  isAllDay: allDay,
                  startAt: allDay ? f.startAt.split('T')[0] : f.startAt,
                  endAt: allDay ? (f.endAt ? f.endAt.split('T')[0] : '') : f.endAt,
                }));
              }}
              style={{ marginTop: 10 }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start *</label>
            <input type={form.isAllDay ? 'date' : 'datetime-local'} value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>End</label>
            <input type={form.isAllDay ? 'date' : 'datetime-local'} value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Matter</label>
            <select value={form.matterId} onChange={e => setForm(f => ({ ...f, matterId: e.target.value }))}>
              <option value="">None</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Colour</label>
            <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}>
              {EVENT_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Recurrence</label>
          <select value={form.recurrencePreset} onChange={e => setForm(f => ({ ...f, recurrencePreset: e.target.value }))}>
            {RECURRENCE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {form.recurrencePreset === 'CUSTOM' && (
          <CustomRRuleBuilder value={form.customRRule} onChange={v => setForm(f => ({ ...f, customRRule: v }))} />
        )}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ margin: 0 }}>Reminders</label>
            <button type="button" className="btn-ghost" style={{ fontSize: 12 }}
              onClick={() => setForm(f => ({ ...f, reminders: [...f.reminders, { message: '', remindAt: nowPlusHour() }] }))}>
              + Add
            </button>
          </div>
          {form.reminders.map((r, i) => (
            <div key={i} className="form-row" style={{ marginBottom: 6 }}>
              <input placeholder="Reminder message" value={r.message}
                onChange={e => { const next = [...form.reminders]; next[i] = { ...next[i], message: e.target.value }; setForm(f => ({ ...f, reminders: next })); }} />
              <input type="datetime-local" value={r.remindAt}
                onChange={e => { const next = [...form.reminders]; next[i] = { ...next[i], remindAt: e.target.value }; setForm(f => ({ ...f, reminders: next })); }} />
              <button type="button" className="doc-icon-btn doc-icon-btn-danger"
                onClick={() => setForm(f => ({ ...f, reminders: f.reminders.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
        </div>
        {rrule && (
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginBottom: 12 }}>
            RRULE: <code>{rrule}</code>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn-primary" disabled={isSaving} onClick={() => onSave({ ...form })}>
            {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task modal ─────────────────────────────────────────
interface TaskForm {
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  matterId: string;
  assignedToId: string;
  reminders: { message: string; remindAt: string }[];
}

function TaskModal({ initial, matters, lawyers, isPartner, onSave, onClose, isSaving }: {
  initial?: UserTaskDto;
  matters: MatterDto[];
  lawyers: LawyerOption[];
  isPartner: boolean;
  onSave: (f: TaskForm) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<TaskForm>({
    title:        initial?.title ?? '',
    description:  initial?.description ?? '',
    dueDate:      initial ? initial.dueDate.split('T')[0] : todayDate(),
    priority:     initial?.priority ?? 'Normal',
    matterId:     initial?.matterId ?? '',
    assignedToId: initial?.assignedToId ?? '',
    reminders:    [],
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h2>{initial ? 'Edit Task' : 'New Task'}</h2>
        <div className="form-group">
          <label>Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. File court documents" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Due Date *</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Matter</label>
          <select value={form.matterId} onChange={e => setForm(f => ({ ...f, matterId: e.target.value }))}>
            <option value="">None</option>
            {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        {isPartner && (
          <div className="form-group">
            <label>Assign to</label>
            <select value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
              <option value="">Myself</option>
              {lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ margin: 0 }}>Reminders</label>
            <button type="button" className="btn-ghost" style={{ fontSize: 12 }}
              onClick={() => setForm(f => ({ ...f, reminders: [...f.reminders, { message: '', remindAt: nowPlusHour() }] }))}>
              + Add
            </button>
          </div>
          {form.reminders.map((r, i) => (
            <div key={i} className="form-row" style={{ marginBottom: 6 }}>
              <input placeholder="Reminder message" value={r.message}
                onChange={e => { const next = [...form.reminders]; next[i] = { ...next[i], message: e.target.value }; setForm(f => ({ ...f, reminders: next })); }} />
              <input type="datetime-local" value={r.remindAt}
                onChange={e => { const next = [...form.reminders]; next[i] = { ...next[i], remindAt: e.target.value }; setForm(f => ({ ...f, reminders: next })); }} />
              <button type="button" className="doc-icon-btn doc-icon-btn-danger"
                onClick={() => setForm(f => ({ ...f, reminders: f.reminders.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn-primary" disabled={isSaving} onClick={() => onSave(form)}>
            {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar page ─────────────────────────────────
export default function Calendar() {
  const toast    = useToast();
  const confirm  = useConfirm();
  const { user } = useAuth();

  const isPartner = user?.role === 'Admin' || user?.role === 'Partner';
  const today     = new Date();

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [items, setItems] = useState<CalendarFeedItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [matters, setMatters]   = useState<MatterDto[]>([]);
  const [lawyers, setLawyers]   = useState<LawyerOption[]>([]);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal]   = useState(false);
  const [editingEvent, setEditingEvent]     = useState<CalendarEventDto | undefined>();
  const [editingTask, setEditingTask]       = useState<UserTaskDto | undefined>();
  const [isSaving, setIsSaving]             = useState(false);
  const [popoverDetail, setPopoverDetail]   = useState<PopoverDetail | null>(null);

  const loadFeed = () => {
    setLoading(true);
    calendarService.getFeed(year, month)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFeed(); }, [year, month]);

  useEffect(() => {
    matterService.getAll().then(setMatters).catch(() => {});
    if (isPartner) clientService.getLawyers().then(setLawyers).catch(() => {});
  }, []);

  const prev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const grid = useMemo(() => {
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const itemsByDay = useMemo(() => {
    const map: Record<number, CalendarFeedItem[]> = {};
    items.forEach(item => {
      const d = new Date(item.date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [items]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  // ── Open popover — fetch full details ─────────────────
  const handleOpenPopover = async (feedItem: CalendarFeedItem) => {
    if (feedItem.kind === 'Hearing' || feedItem.kind === 'Filing') {
      setPopoverDetail({ kind: 'readonly', feedItem });
      return;
    }
    setPopoverDetail({ kind: 'loading', feedItem });
    try {
      if (feedItem.kind === 'Event') {
        const full = await calendarService.getEvent(feedItem.sourceId);
        setPopoverDetail({ kind: 'event', feedItem, full });
      } else if (feedItem.kind === 'Task') {
        const full = await calendarService.getTaskDetail(feedItem.sourceId);
        setPopoverDetail({ kind: 'task', feedItem, full });
      }
    } catch {
      setPopoverDetail({ kind: 'readonly', feedItem });
    }
  };

  // ── Event save ────────────────────────────────────────
  const handleSaveEvent = async (form: EventForm) => {
    if (!form.title.trim()) { toast.warning('Title required', 'Please enter a title.'); return; }
    if (!form.startAt)      { toast.warning('Start required', 'Please set a start date/time.'); return; }

    const rrule = form.recurrencePreset === 'CUSTOM'
      ? buildRRule(form.customRRule)
      : form.recurrencePreset || null;

    const payload = {
      title:          form.title,
      description:    form.description || null,
      location:       form.location || null,
      startAt:        new Date(form.startAt).toISOString(),
      endAt:          form.endAt ? new Date(form.endAt).toISOString() : null,
      isAllDay:       form.isAllDay,
      color:          form.color,
      recurrenceRule: rrule,
      matterId:       form.matterId || null,
      reminders:      form.reminders.filter(r => r.message && r.remindAt).map(r => ({
        message:  r.message,
        remindAt: new Date(r.remindAt).toISOString(),
      })),
    };

    setIsSaving(true);
    try {
      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, payload);
        toast.success('Event updated', '');
      } else {
        await calendarService.createEvent(payload);
        toast.success('Event created', '');
      }
      setShowEventModal(false);
      setEditingEvent(undefined);
      loadFeed();
    } catch {
      toast.error('Failed to save event', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Task save ─────────────────────────────────────────
  const handleSaveTask = async (form: TaskForm) => {
    if (!form.title.trim()) { toast.warning('Title required', 'Please enter a title.'); return; }
    if (!form.dueDate)      { toast.warning('Due date required', 'Please set a due date.'); return; }

    const payload = {
      title:        form.title,
      description:  form.description || null,
      dueDate:      new Date(form.dueDate).toISOString(),
      priority:     form.priority,
      matterId:     form.matterId || null,
      assignedToId: form.assignedToId || null,
      reminders:    form.reminders.filter(r => r.message && r.remindAt).map(r => ({
        message:  r.message,
        remindAt: new Date(r.remindAt).toISOString(),
      })),
    };

    setIsSaving(true);
    try {
      if (editingTask) {
        await calendarService.updateTask(editingTask.id, payload);
        toast.success('Task updated', '');
      } else {
        await calendarService.createTask(payload);
        toast.success('Task created', '');
      }
      setShowTaskModal(false);
      setEditingTask(undefined);
      loadFeed();
    } catch {
      toast.error('Failed to save task', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (item: CalendarFeedItem) => {
    const snapshot = item;
    setPopoverDetail(null);
    const confirmed = await confirm({
      title:        `Delete ${snapshot.kind}`,
      message:      `"${snapshot.title}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      variant:      'danger',
    });
    if (!confirmed) return;
    try {
      if (snapshot.kind === 'Event') {
        await calendarService.deleteEvent(snapshot.sourceId);
      } else if (snapshot.kind === 'Task') {
        await calendarService.deleteTask(snapshot.sourceId);
      }
      toast.success('Deleted', '');
      loadFeed();
    } catch {
      toast.error('Delete failed', 'Please try again.');
    }
  };

  // ── Edit ──────────────────────────────────────────────
  const handleEdit = async (item: CalendarFeedItem) => {
    const snapshot = item;
    setPopoverDetail(null);

    if (snapshot.kind === 'Event') {
      try {
        const ev = await calendarService.getEvent(snapshot.sourceId);
        setEditingEvent(ev);
        setShowEventModal(true);
      } catch {
        toast.error('Failed to load event', 'Please try again.');
      }
    } else if (snapshot.kind === 'Task') {
      try {
        const task = await calendarService.getTaskDetail(snapshot.sourceId);
        setEditingTask(task);
        setShowTaskModal(true);
      } catch {
        // Fallback with feed data
        setEditingTask({
          id:             snapshot.sourceId,
          title:          snapshot.title,
          description:    null,
          dueDate:        snapshot.date.split('T')[0],
          priority:       snapshot.priority ?? 'Normal',
          isCompleted:    snapshot.isCompleted,
          completedAt:    null,
          assignedToId:   '',
          assignedToName: '',
          assignedById:   null,
          assignedByName: null,
          matterId:       snapshot.matterId,
          matterTitle:    snapshot.matterTitle,
          reminders:      [],
          createdAt:      '',
        });
        setShowTaskModal(true);
      }
    }
  };

  // ── Toggle task complete ──────────────────────────────
  const handleToggleComplete = async (item: CalendarFeedItem) => {
    if (item.kind !== 'Task') return;
    try {
      await calendarService.completeTask(item.sourceId);
      loadFeed();
    } catch {
      toast.error('Could not update task', 'Please try again.');
    }
  };

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <div className="page-header-meta">Hearings, filings, events and tasks across your matters</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => { setEditingTask(undefined); setShowTaskModal(true); }}>+ New Task</button>
          <button className="btn-primary"   onClick={() => { setEditingEvent(undefined); setShowEventModal(true); }}>+ New Event</button>
        </div>
      </div>

      <div className="calendar-nav">
        <button className="btn-secondary" onClick={prev}>‹</button>
        <span className="calendar-month-label">{MONTHS[month - 1]} {year}</span>
        <button className="btn-secondary" onClick={next}>›</button>
        <button className="btn-secondary" style={{ marginLeft: 'auto' }}
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}>
          Today
        </button>
      </div>

      {isLoading ? (
        <div className="skeleton-block" style={{ height: 500, borderRadius: 6, marginTop: 16 }} />
      ) : (
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
          {grid.map((day, i) => (
            <div key={i} className={`calendar-cell ${!day ? 'calendar-cell-empty' : ''} ${day && isToday(day) ? 'calendar-cell-today' : ''}`}>
              {day && (
                <>
                  <span className="calendar-date-num">{day}</span>
                  <div className="calendar-events">
                    {(itemsByDay[day] || []).map(item => (
                      <div
                        key={item.id}
                        className={`calendar-event ${urgencyClass(item.date, item.color)} ${item.isCompleted ? 'calendar-event-done' : ''}`}
                        onClick={() => handleOpenPopover(item)}
                        title={[item.kind, item.title, item.clientName].filter(Boolean).join(' — ')}
                        style={{ cursor: 'pointer' }}
                      >
                        {item.kind === 'Task' ? (
                          <span className="cal-task-check"
                            onClick={e => { e.stopPropagation(); handleToggleComplete(item); }}
                            title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}>
                            {item.isCompleted ? '☑' : '☐'}
                          </span>
                        ) : (
                          <span className="calendar-event-type">{typeIcon(item.kind)}</span>
                        )}
                        {item.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot event-red" />Urgent / Hearing</span>
        <span className="legend-item"><span className="legend-dot event-amber" />Filing deadline</span>
        <span className="legend-item"><span className="legend-dot event-green" />Upcoming</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#1D4ED8' }} />Event</span>
        <span className="legend-item"><span style={{ fontSize: 12 }}>☑</span> Task complete</span>
      </div>

      {popoverDetail && (
        <DetailPopover
          detail={popoverDetail}
          onClose={() => setPopoverDetail(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showEventModal && (
        <EventModal
          initial={editingEvent}
          matters={matters}
          onSave={handleSaveEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(undefined); }}
          isSaving={isSaving}
        />
      )}

      {showTaskModal && (
        <TaskModal
          initial={editingTask}
          matters={matters}
          lawyers={lawyers}
          isPartner={isPartner}
          onSave={handleSaveTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(undefined); }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
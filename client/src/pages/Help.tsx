import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import './Phase4.css';
import './Help.css';

interface Section {
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

const adminSections: Section[] = [
  {
    title: 'User Management',
    icon: '👥',
    items: [
      { q: 'How do I create a new user?', a: 'Go to Users in the sidebar. Click "Add User", enter their name, email, and role. They will receive an email with a temporary password and must change it on first login.' },
      { q: 'How do I deactivate a user?', a: 'Find the user in the Users list and click the toggle to deactivate them. They will be immediately unable to log in, but their historical data is preserved.' },
      { q: 'What roles are available?', a: 'Admin (full access), Partner (firm-wide data + approvals), Associate (assigned matters only), Paralegal (same as Associate), Client (own matters only), Auditor (read-only audit log access).' },
    ],
  },
  {
    title: 'Audit Log',
    icon: '📋',
    items: [
      { q: 'What is recorded in the audit log?', a: 'Every significant action: logins, document uploads and downloads, invoice approvals, user role changes, and data deletions. The log is append-only and cannot be edited.' },
      { q: 'How do I filter the audit log?', a: 'Use the toolbar on the Audit Log page to filter by user name, action type, or date range. You can combine all three filters.' },
      { q: 'Why is the audit log important?', a: 'It satisfies the Kenya Data Protection Act and the Computer Misuse and Cybercrimes Act. It also proves when documents were accessed or sent, protecting the firm in client disputes.' },
    ],
  },
  {
    title: 'System Health',
    icon: '⚡',
    items: [
      { q: 'What does the System Health page show?', a: 'Database connectivity, file storage availability, API response time, storage used, and the number of active user sessions.' },
      { q: 'What should I do if the database shows offline?', a: 'Check your Supabase project status at supabase.com. If Supabase is operational, restart the API server. Contact your system administrator if the problem persists.' },
    ],
  },
];

const partnerSections: Section[] = [
  {
    title: 'Matters',
    icon: '📁',
    items: [
      { q: 'How do I open a new matter?', a: 'Go to Matters and click "New Matter". Fill in the title, client, JICMS case number, court station, assigned lawyer, and any known hearing dates. All fields except title are optional at creation.' },
      { q: 'How do I assign a matter to a lawyer?', a: 'Open the matter, click Edit, and select a lawyer from the "Assigned To" dropdown. Associates and Paralegals can only see matters assigned to them.' },
      { q: 'How do I close a matter?', a: 'Open the matter detail page and click "Close Matter" in the header. The matter is marked closed but all data is preserved. You can reopen it if needed.' },
    ],
  },
  {
    title: 'Fee Notes & Billing',
    icon: '💰',
    items: [
      { q: 'How is a fee note generated?', a: 'On any matter\'s Billing tab, click "Generate Fee Note". The system collects all unbilled time entries, calculates the total including 16% VAT, generates a PDF, and saves it to storage.' },
      { q: 'How do I approve a fee note?', a: 'On the Billing tab, fee notes with status "Pending Approval" show a green checkmark button. Click it to approve. Only approved fee notes can be invoiced.' },
      { q: 'How do I create an invoice from a fee note?', a: 'Once a fee note is approved, an "Invoice" button appears next to it. Click it, set the due date, and the invoice PDF is generated automatically.' },
      { q: 'How do I mark an invoice as paid?', a: 'On the Billing tab, invoices with status "Sent" or "Overdue" show a "Mark Paid" button. Click it to record manual payment. M-Pesa payments will update this automatically.' },
    ],
  },
  {
    title: 'Reports',
    icon: '📊',
    items: [
      { q: 'What does the productivity report show?', a: 'For each lawyer: total hours logged, hours billed, billing rate (billed vs total), and total amount. This quickly identifies under-billing.' },
      { q: 'How do I export a report?', a: 'Each report section has an "Export CSV" button. The full page can also be printed to PDF using your browser\'s print dialog (click "Print / Export PDF").' },
    ],
  },
  {
    title: 'Calendar & Delegation',
    icon: '📅',
    items: [
      { q: 'How do I create a task for an Associate?', a: 'Go to Calendar and click "+ New Task". Fill in the title, due date, priority, and matter. As a Partner, you will see an "Assign to" dropdown — select the Associate.' },
      { q: 'Can I see all firm events on the calendar?', a: 'The calendar shows all hearing dates and filing deadlines from matters across the firm. Personal events and tasks remain private to each user.' },
    ],
  },
];

const associateSections: Section[] = [
  {
    title: 'Your Matters',
    icon: '📁',
    items: [
      { q: 'Why can I only see some matters?', a: 'Associates and Paralegals only see matters they are assigned to. If a matter is missing, ask your supervising Partner to assign you to it.' },
      { q: 'How do I view documents on a matter?', a: 'Open the matter, click the Documents tab. All documents uploaded to this matter are listed. Click any document to preview it, or use the download button.' },
    ],
  },
  {
    title: 'Time Tracking',
    icon: '⏱',
    items: [
      { q: 'How do I log time?', a: 'Open a matter and click the Time tab. Use the stopwatch — click Start when you begin work and Stop when you finish. The duration auto-fills the hours field. Add a description and click Log Time.' },
      { q: 'Can I log time manually?', a: 'Yes. On the Time tab, enter the hours, rate, description, and date directly without using the stopwatch. This is useful for recording calls or meetings that happened earlier.' },
      { q: 'Can I edit a time entry after saving?', a: 'Yes, while the entry is not yet billed. Click the edit icon on any unbilled entry. Once a Partner marks the entry as billed it becomes locked.' },
    ],
  },
  {
    title: 'Documents',
    icon: '📄',
    items: [
      { q: 'How do I upload a document to a matter?', a: 'On the matter\'s Documents tab, drag and drop a file onto the upload zone, or click to browse. PDFs and Word documents are supported for full-text search.' },
      { q: 'What is full-text search?', a: 'On the Documents page (sidebar), the left search box searches inside document contents — not just file names. Type a clause or phrase and matching documents appear with highlighted excerpts.' },
      { q: 'How does versioning work?', a: 'If you upload a file with the same name as an existing document on the same matter, the system automatically creates version 2. The latest version is shown by default; click the clock icon to see history.' },
    ],
  },
  {
    title: 'Calendar & Tasks',
    icon: '📅',
    items: [
      { q: 'Where do I see my upcoming deadlines?', a: 'The Calendar page shows all hearing dates and filing deadlines for your assigned matters, colour-coded by urgency: red (within 48h), amber (within 7 days), green (later).' },
      { q: 'How do I set a reminder?', a: 'When creating an event or task, click "+ Add" in the Reminders section, enter a message and the reminder date/time. You will receive an email and an in-app notification when the reminder fires.' },
      { q: 'How do I mark a task as done?', a: 'On the Calendar, click the checkbox (☐) on any task chip to toggle it complete. Or click the task to open the detail panel and click "Mark as Done".' },
    ],
  },
];

const clientSections: Section[] = [
  {
    title: 'Your Matters',
    icon: '📁',
    items: [
      { q: 'How do I view my matter details?', a: 'Your dashboard shows all active matters. Click any matter title to see the full detail — court station, assigned lawyer, hearing dates, and filing deadlines.' },
      { q: 'Who do I contact about my case?', a: 'The matter detail page shows the assigned lawyer\'s name. Contact your firm directly via the email or phone number they provided.' },
    ],
  },
  {
    title: 'Invoices',
    icon: '💰',
    items: [
      { q: 'How do I pay an invoice?', a: 'Your dashboard shows outstanding invoices. Click "Pay via M-Pesa" — you will receive a payment prompt directly on your phone. Enter your M-Pesa PIN to confirm.' },
      { q: 'Where can I see paid invoices?', a: 'Your invoice history shows all invoices with their current status: Draft, Sent, Paid, or Overdue.' },
    ],
  },
];

const getSections = (role: string): Section[] => {
  switch (role) {
    case 'Admin':     return adminSections;
    case 'Partner':   return partnerSections;
    case 'Associate':
    case 'Paralegal': return associateSections;
    case 'Client':    return clientSections;
    default:          return associateSections;
  }
};

const roleTitles: Record<string, string> = {
  Admin:     'Administrator Guide',
  Partner:   'Partner Guide',
  Associate: 'Associate & Paralegal Guide',
  Paralegal: 'Associate & Paralegal Guide',
  Client:    'Client Portal Guide',
};

export default function Help() {
  const { user } = useAuth();
  const role = user?.role ?? 'Associate';
  const sections = getSections(role);
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen(prev => prev === key ? null : key);

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1>{roleTitles[role] ?? 'Help'}</h1>
          <div className="page-header-meta">Frequently asked questions for your role · {role}</div>
        </div>
        <button className="btn-secondary" onClick={() => window.print()}>Print Guide</button>
      </div>

      {sections.map(section => (
        <div key={section.title} className="info-card" style={{ marginBottom: 16 }}>
          <div className="info-card-header">
            <h3>{section.icon} {section.title}</h3>
          </div>
          <div>
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`;
              const isOpen = open === key;
              return (
                <div key={key} className="help-item">
                  <button
                    className="help-question"
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span className="help-chevron">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="help-answer">{item.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="info-card" style={{ marginBottom: 16 }}>
        <div className="info-card-header"><h3>🎓 Interactive Tour</h3></div>
        <div className="info-card-body">
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16 }}>
            The interactive tour highlights the actual UI elements in sequence and guides you through the system step by step.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              localStorage.removeItem(`ayiyacms_tour_done_${user?.id}`);
              window.location.href = '/dashboard';
            }}
          >
            Restart Interactive Tour
          </button>
        </div>
      </div>
    </div>
  );
}
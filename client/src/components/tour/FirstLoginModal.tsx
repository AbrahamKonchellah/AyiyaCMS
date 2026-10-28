import { useNavigate } from 'react-router-dom';

interface Props {
  role: string;
  userName: string;
  onStartTour: () => void;
  onDismiss: () => void;
}

const roleDescriptions: Record<string, string> = {
  Admin:      'You have full access to user management, audit logs, system health, and all firm data.',
  Partner:    'You can manage matters, approve fee notes, view firm-wide reports, and delegate tasks to your team.',
  Associate:  'You can view your assigned matters, log time, manage documents, and track your calendar.',
  Paralegal:  'You can view your assigned matters, log time, manage documents, and track your calendar.',
  Client:     'You can view your active matters, upcoming hearings, and outstanding invoices.',
};

export default function FirstLoginModal({ role, userName, onStartTour, onDismiss }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
        <h2 style={{ marginBottom: 6 }}>Welcome to AyiyaCMS{userName ? `, ${userName.split(' ')[0]}` : ''}!</h2>
        <p className="modal-sub" style={{ marginBottom: 16 }}>
          {roleDescriptions[role] ?? roleDescriptions['Associate']}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 24, lineHeight: 1.5 }}>
          Would you like a quick interactive tour? It highlights the key features for your role
          and takes about 2 minutes. You can restart it any time from the <strong>?</strong> button.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={onDismiss}>Skip for now</button>
          <button className="btn-primary" onClick={onStartTour}>Start Tour →</button>
        </div>
      </div>
    </div>
  );
}
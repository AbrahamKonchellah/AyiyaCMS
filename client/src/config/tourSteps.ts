import { TourStep } from '../hooks/useTour';

export const adminTourSteps: TourStep[] = [
  {
    target: '.sidebar-logo',
    title: 'Welcome to AyiyaCMS',
    content: 'This is your law practice management system. This tour will walk you through the key features for Administrators.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    target: '[href="/dashboard"]',
    title: 'Dashboard',
    content: 'Your dashboard shows a real-time snapshot: active matters, upcoming hearings, outstanding invoices, and recent activity across the firm.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    target: '[href="/users"]',
    title: 'User Management',
    content: 'As Admin, you can create, activate, deactivate, and assign roles to all staff. Create a user here and they will receive a temporary password by email.',
    placement: 'right',
    route: '/users',
  },
  {
    target: '[href="/audit-logs"]',
    title: 'Audit Log',
    content: 'Every significant action in the system is recorded here — logins, document uploads, invoice approvals. This log cannot be edited or deleted, satisfying KDPA requirements.',
    placement: 'right',
    route: '/audit-logs',
  },
  {
    target: '[href="/reports"]',
    title: 'Reports',
    content: 'View firm-wide analytics: case performance, lawyer productivity, financial summaries, and client activity. All sections can be exported to CSV or printed to PDF.',
    placement: 'right',
    route: '/reports',
  },
  {
    target: '.page-header',
    title: 'System Health',
    content: 'Check database connectivity, storage availability, API response time, and active sessions — all from one page.',
    placement: 'bottom',
    route: '/system-health',
  },
];

export const partnerTourSteps: TourStep[] = [
  {
    target: '.sidebar-logo',
    title: 'Welcome to AyiyaCMS',
    content: 'This tour covers the key workflows for Partners — from opening matters to generating and approving fee notes.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    target: '[href="/matters"]',
    title: 'Matters',
    content: 'All active and closed matters are listed here. Partners can see every matter in the firm. Click any matter to open its detail page.',
    placement: 'right',
    route: '/matters',
  },
  {
    target: '.btn-primary',
    title: 'Create a Matter',
    content: 'Click here to open a new matter. You will fill in the client, case number, court station, assigned lawyer, hearing date, and filing deadline.',
    placement: 'left',
    route: '/matters',
  },
  {
    target: '[href="/calendar"]',
    title: 'Calendar',
    content: 'All hearing dates and filing deadlines appear here automatically. You can also create personal events, delegate tasks to Associates, and set reminders.',
    placement: 'right',
    route: '/calendar',
  },
  {
    target: '[href="/documents"]',
    title: 'Documents',
    content: 'Every document uploaded across all matters appears here. Use the content search to find text inside PDFs and Word files instantly.',
    placement: 'right',
    route: '/documents',
  },
  {
    target: '[href="/reports"]',
    title: 'Reports & Billing',
    content: 'Monitor lawyer productivity, outstanding invoices, and monthly revenue trends. From matter detail pages you can generate fee notes and approve them before sending to clients.',
    placement: 'right',
    route: '/reports',
  },
];

export const associateTourSteps: TourStep[] = [
  {
    target: '.sidebar-logo',
    title: 'Welcome to AyiyaCMS',
    content: 'This tour covers your key daily workflows — viewing your assigned matters, logging time, and managing documents.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    target: '[href="/matters"]',
    title: 'Your Matters',
    content: 'You only see matters you are assigned to. Click any matter to open its full detail page with tabs for Overview, Documents, Time, and Billing.',
    placement: 'right',
    route: '/matters',
  },
  {
    target: '[href="/calendar"]',
    title: 'Calendar',
    content: 'Your hearing dates appear here automatically. You can also create personal events, set tasks with deadlines, and add reminders so you never miss a deadline.',
    placement: 'right',
    route: '/calendar',
  },
  {
    target: '[href="/documents"]',
    title: 'Documents',
    content: 'All documents across your assigned matters are visible here. Use the content search to find specific clauses or references inside uploaded files.',
    placement: 'right',
    route: '/documents',
  },
  {
    target: '.page-header',
    title: 'Time Tracking',
    content: 'On any matter\'s Time tab, use the stopwatch to track time precisely, or enter time manually. Log a description of the work — this feeds directly into fee note generation.',
    placement: 'bottom',
    route: '/matters',
  },
];

export const clientTourSteps: TourStep[] = [
  {
    target: '.sidebar-logo',
    title: 'Welcome to AyiyaCMS',
    content: 'Welcome to your client portal. This is your secure view of your legal matters and billing.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    target: '.page-header',
    title: 'Your Dashboard',
    content: 'Here you can see a summary of your active matters, upcoming hearings, and outstanding invoices at a glance.',
    placement: 'bottom',
    route: '/dashboard',
  },
];

export const getTourSteps = (role: string): TourStep[] => {
  switch (role) {
    case 'Admin':     return adminTourSteps;
    case 'Partner':   return partnerTourSteps;
    case 'Associate':
    case 'Paralegal': return associateTourSteps;
    case 'Client':    return clientTourSteps;
    default:          return associateTourSteps;
  }
};
// src/services/calendarService.ts
import api from './api';

// ── Feed items (what the calendar grid renders) ────────
export interface CalendarFeedItem {
  id: string;
  kind: 'Hearing' | 'Filing' | 'Event' | 'Task';
  title: string;
  clientName: string | null;
  matterTitle: string | null;
  location: string | null;
  date: string;           // ISO datetime
  endDate: string | null;
  isAllDay: boolean;
  isCompleted: boolean;
  color: string;
  priority: string | null;
  matterId: string | null;
  sourceId: string;       
}

// ── Calendar events ────────────────────────────────────
export interface ReminderDto {
  id: string;
  message: string;
  remindAt: string;
  sentEmail: boolean;
  readAt: string | null;
}

export interface CalendarEventDto {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  color: string | null;
  recurrenceRule: string | null;
  createdById: string;
  createdByName: string;
  matterId: string | null;
  matterTitle: string | null;
  reminders: ReminderDto[];
  createdAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  color?: string | null;
  recurrenceRule?: string | null;
  matterId?: string | null;
  reminders: { message: string; remindAt: string }[];
}

export interface UpdateCalendarEventRequest extends CreateCalendarEventRequest {}

// ── Tasks ──────────────────────────────────────────────
export interface UserTaskDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: string;
  isCompleted: boolean;
  completedAt: string | null;
  assignedToId: string;
  assignedToName: string;
  assignedById: string | null;
  assignedByName: string | null;
  matterId: string | null;
  matterTitle: string | null;
  reminders: ReminderDto[];
  createdAt: string;
}

export interface CreateUserTaskRequest {
  title: string;
  description?: string | null;
  dueDate: string;
  priority: string;
  matterId?: string | null;
  assignedToId?: string | null;
  reminders: { message: string; remindAt: string }[];
}

export interface UpdateUserTaskRequest extends CreateUserTaskRequest {}

// ── Notifications ──────────────────────────────────────
export interface NotificationDto {
  id: string;
  message: string;
  remindAt: string;
  sentEmail: boolean;
  readAt: string | null;
}

// ── RRULE presets ──────────────────────────────────────
export const RECURRENCE_PRESETS = [
  { label: 'None',           value: '' },
  { label: 'Daily',          value: 'FREQ=DAILY' },
  { label: 'Weekly',         value: 'FREQ=WEEKLY' },
  { label: 'Weekdays only',  value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Monthly',        value: 'FREQ=MONTHLY' },
  { label: 'Yearly',         value: 'FREQ=YEARLY' },
  { label: 'Custom…',        value: 'CUSTOM' },
] as const;

// ── Service ────────────────────────────────────────────
const calendarService = {
  // Feed
  getFeed: (year: number, month: number) =>
    api.get<CalendarFeedItem[]>('/calendar', { params: { year, month } }).then(r => r.data),

  // Events
  createEvent: (req: CreateCalendarEventRequest) =>
    api.post<CalendarEventDto>('/calendar/events', req).then(r => r.data),

  updateEvent: (id: string, req: UpdateCalendarEventRequest) =>
    api.put<CalendarEventDto>(`/calendar/events/${id}`, req).then(r => r.data),

  deleteEvent: (id: string) =>
    api.delete(`/calendar/events/${id}`),

  getEvent: (id: string) =>
    api.get<CalendarEventDto>(`/calendar/events/${id}`).then(r => r.data),

  // Tasks
  createTask: (req: CreateUserTaskRequest) =>
    api.post<UserTaskDto>('/calendar/tasks', req).then(r => r.data),

  updateTask: (id: string, req: UpdateUserTaskRequest) =>
    api.put<UserTaskDto>(`/calendar/tasks/${id}`, req).then(r => r.data),

  completeTask: (id: string) =>
    api.patch(`/calendar/tasks/${id}/complete`),

  deleteTask: (id: string) =>
    api.delete(`/calendar/tasks/${id}`),

  getTasksForMatter: (matterId: string) =>
    api.get<UserTaskDto[]>(`/calendar/tasks/matter/${matterId}`).then(r => r.data),

  getTaskDetail: (id: string) =>
    api.get<UserTaskDto>(`/calendar/tasks/${id}`).then(r => r.data),

  // Reminders
  addEventReminder: (eventId: string, message: string, remindAt: string) =>
    api.post<ReminderDto>(`/calendar/events/${eventId}/reminders`, { message, remindAt }).then(r => r.data),

  addTaskReminder: (taskId: string, message: string, remindAt: string) =>
    api.post<ReminderDto>(`/calendar/tasks/${taskId}/reminders`, { message, remindAt }).then(r => r.data),

  deleteReminder: (reminderId: string) =>
    api.delete(`/calendar/reminders/${reminderId}`),

  // Notifications
  getUnreadCount: () =>
    api.get<number>('/notifications/unread-count').then(r => r.data),

  getNotifications: () =>
    api.get<NotificationDto[]>('/notifications').then(r => r.data),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/read-all'),

  // Matter timeline
  getMatterTimeline: (matterId: string): Promise<CalendarFeedItem[]> =>
    api.get<CalendarFeedItem[]>(`/calendar/matter/${matterId}`).then(r => r.data),
};

export default calendarService;
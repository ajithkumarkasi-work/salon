import { addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Notification, NotificationType, UserRole } from '@glowbook/shared-types';
import { Collections } from '../collections';
import { createFirestoreService } from './firestore-service';

export const notificationsService = createFirestoreService<Notification>(Collections.notifications);

export function isBusinessNotificationAudience(role?: UserRole): boolean {
  return role === UserRole.SALON_OWNER || role === UserRole.ADMIN;
}

export function filterNotificationsForAudience(notifications: Notification[], userId: string, role?: UserRole): Notification[] {
  if (isBusinessNotificationAudience(role)) {
    return notifications;
  }

  return notifications.filter((notification) => notification.userId === userId);
}

export function listNotificationsByUser(userId: string, role?: UserRole) {
  console.log('[notifications] listNotificationsByUser', { userId, role });

  return notificationsService.list().then((notifications) => {
    const visible = filterNotificationsForAudience(notifications, userId, role);
    console.log('[notifications] fetched', { userId, role, count: visible.length, sample: visible.slice(0, 5) });
    return visible.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  });
}

export async function debugListAllNotifications() {
  const notifications = await notificationsService.list();
  console.log('[notifications] debugListAllNotifications', { count: notifications.length, items: notifications });
  return notifications;
}

export function resolveStatusNotificationRecipients(input: {
  customerId: string;
  ownerId?: string | null;
  adminIds?: Array<string | null | undefined>;
}): Set<string> {
  const recipients = new Set<string>();

  if (input.customerId) recipients.add(input.customerId);
  if (input.ownerId) recipients.add(input.ownerId);

  for (const adminId of input.adminIds ?? []) {
    if (adminId) recipients.add(adminId);
  }

  return recipients;
}

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await addDoc(notificationsService.collectionRef(), {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
    readAt: null,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function notifyAppointmentStatusChange(input: {
  customerId: string;
  ownerId?: string | null;
  adminIds?: Array<string | null | undefined>;
  status: string;
  appointmentId: string;
  title?: string;
  body?: string;
  changedById?: string;
  changedByName?: string;
  changedByRole?: UserRole;
}): Promise<void> {
  const actorName = input.changedByName || 'Someone';
  const actorRole = input.changedByRole ? input.changedByRole.replace('_', ' ').toLowerCase() : 'user';
  const title = input.title ?? 'Appointment status updated';
  const body =
    input.body ??
    `${actorName} (${actorRole}) changed the appointment status to ${input.status.replace('_', ' ').toLowerCase()}.`;

  const recipients = resolveStatusNotificationRecipients({
    customerId: input.customerId,
    ownerId: input.ownerId,
    adminIds: input.adminIds,
  });

  await Promise.all(
    Array.from(recipients).map((userId) =>
      notifyUser({
        userId,
        type: NotificationType.APPOINTMENT_STATUS_UPDATED,
        title,
        body,
        data: {
          appointmentId: input.appointmentId,
          status: input.status,
          changedById: input.changedById ?? null,
          changedByName: input.changedByName ?? null,
          changedByRole: input.changedByRole ?? null,
        },
      }),
    ),
  );
}

export async function markAllNotificationsRead(userId: string, role?: UserRole): Promise<void> {
  const unread = await notificationsService.list(where('isRead', '==', false));
  const visible = filterNotificationsForAudience(unread, userId, role);

  await Promise.all(
    visible.map((n) => notificationsService.update(n.id, { isRead: true, readAt: new Date().toISOString() })),
  );
}

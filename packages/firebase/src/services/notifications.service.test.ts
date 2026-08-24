import test from 'node:test';
import assert from 'node:assert/strict';

import { filterNotificationsForAudience, resolveStatusNotificationRecipients } from './notifications.service';

test('status change notifications include customer, salon owner, and admins', () => {
  const recipients = resolveStatusNotificationRecipients({
    customerId: 'customer-1',
    ownerId: 'owner-1',
    adminIds: ['admin-1', 'admin-2', 'owner-1'],
  });

  assert.deepEqual(Array.from(recipients).sort(), ['admin-1', 'admin-2', 'customer-1', 'owner-1'].sort());
});

test('owner and admin see all notifications while customer and staff see only their own', () => {
  const notifications = [
    { id: '1', userId: 'customer-1', title: 'A', body: 'B', type: 'APPOINTMENT_STATUS_UPDATED', data: null, readAt: null, isRead: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: '2', userId: 'customer-2', title: 'C', body: 'D', type: 'APPOINTMENT_STATUS_UPDATED', data: null, readAt: null, isRead: false, createdAt: '2024-01-02', updatedAt: '2024-01-02' },
  ] as any;

  assert.equal(filterNotificationsForAudience(notifications, 'customer-1', 'CUSTOMER').length, 1);
  assert.equal(filterNotificationsForAudience(notifications, 'customer-1', 'SALON_OWNER').length, 2);
  assert.equal(filterNotificationsForAudience(notifications, 'customer-1', 'ADMIN').length, 2);
});
